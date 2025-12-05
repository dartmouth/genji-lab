
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from dotenv import load_dotenv, find_dotenv
from typing import List

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.models import Annotation as AnnotationModel
from schemas.search import (
    SearchQuery,
    SearchResponse,
    SearchResult
)

from dataclasses import dataclass, field
from typing import List

@dataclass 
class Term:
    type: str
    term: str
    group: List['Term'] | None
    operator: str | None

    OPERATOR_MAP = {
        'AND': 'AND',
        'and': 'AND',
        'OR': 'OR',
        'or': 'OR'
    }
    TYPES = ('group', 'term')

    def __post_init__(self):
        if self.operator is not None and self.operator not in self.OPERATOR_MAP:
            raise ValueError(f"Only AND and OR operations supported")
        
        if self.type not in self.TYPES:
            raise ValueError("Type must be one of 'group' or 'term'")

        if self.group is not None:
            self.group = [Term(**term) for term in self.group]

@dataclass
class Query:
    query: str
    parsedQuery: List[Term]
    searchTypes: List[str]
    tags: List[str]
    sortBy: str
    sortOrder: str
    limit: int
    pgroonga_query: str = field(init=False)
    
    def __post_init__(self):
        if len(self.parsedQuery) == 0:
            raise ValueError("No elements in parsed query")
        self.parsedQuery = [Term(**t) for t in self.parsedQuery]

        if self.parsedQuery[0].operator is not None:
            raise ValueError("Invalid operand: first term must not have an operator")
        
        self.pgroonga_query = self._build_pgroonga_query()
    
    def _build_pgroonga_query(self):
        """Convert structured query to natural language format for PGroonga"""
        parts = []
        for term in self.parsedQuery:
            if term.type == 'term':
                if term.operator:
                    parts.append(term.operator.upper())
                parts.append(term.term)
            elif term.type == 'group':
                # Flatten groups into natural language
                group_parts = []
                for group_term in term.group:
                    if group_term.operator:
                        group_parts.append(group_term.operator.upper())
                    group_parts.append(group_term.term)
                parts.append(f"({' '.join(group_parts)})")
        
        return ' '.join(parts)

load_dotenv(find_dotenv())

router = APIRouter(
    prefix="/api/v1/search",
    tags=["search"],
    responses={404: {"description": "Annotation not found"}},
)

# Updated query using PGroonga for multilingual full-text search with fuzzy matching
ELEMENT_QUERY = text("""
WITH ranked_elements AS (
    SELECT
        null as annotation_id,
        de.id as element_id,
        de.document_id,
        d.id as collection_id,
        de.content ->> 'text' as content,
        'element' as type,
        null as motivation,
        'DocumentElements/' || de.id as source,
        de.created,
        pgroonga_score(de.tableoid, de.ctid) as relevance_score
    FROM app.document_elements de
    JOIN app.documents d ON de.document_id = d.id
    WHERE (de.content->>'text') &@~ :query
)
SELECT * FROM ranked_elements
ORDER BY
    CASE WHEN :descending THEN relevance_score END DESC,
    CASE WHEN NOT :descending THEN relevance_score END ASC,
    CASE WHEN :descending THEN created END DESC,
    CASE WHEN NOT :descending THEN created END ASC
LIMIT :limit;
""")

COMMENTS_QUERY = text("""
WITH ranked_annotations AS (
    SELECT 
        a.id as annotation_id,
        split_part(a.target -> 0 ->> 'source', '/', 2)::int as element_id,
        d.id as document_id,
        d.id as collection_id,
        a.body ->> 'value' as content,
        'annotation' as type,
        a.target -> 0 ->> 'source' as source,
        motivation,
        a.created,
        pgroonga_score(a.tableoid, a.ctid) as relevance_score
    FROM app.annotations a 
    JOIN app.documents d ON split_part(a.target -> 0 ->> 'source', '/', 2)::int = d.id
    WHERE (a.body->>'value') &@~ :query
    AND a.motivation IN ('commenting')
)
SELECT * FROM ranked_annotations
ORDER BY 
    CASE WHEN :descending THEN relevance_score END DESC,
    CASE WHEN NOT :descending THEN relevance_score END ASC,
    CASE WHEN :descending THEN created END DESC,
    CASE WHEN NOT :descending THEN created END ASC
LIMIT :limit;
""")

ANNOTATIONS_QUERY = text("""
WITH ranked_annotations AS (
    SELECT 
        a.id as annotation_id,
        split_part(a.target -> 0 ->> 'source', '/', 2)::int as element_id,
        d.id as document_id,
        d.id as collection_id,
        a.body ->> 'value' as content,
        'annotation' as type,
        a.target -> 0 ->> 'source' as source,
        motivation,
        a.created,
        pgroonga_score(a.tableoid, a.ctid) as relevance_score
    FROM app.annotations a 
    JOIN app.documents d ON split_part(a.target -> 0 ->> 'source', '/', 2)::int = d.id
    WHERE (a.body->>'value') &@~ :query
    AND a.motivation IN ('scholarly')
)
SELECT * FROM ranked_annotations
ORDER BY 
    CASE WHEN :descending THEN relevance_score END DESC,
    CASE WHEN NOT :descending THEN relevance_score END ASC,
    CASE WHEN :descending THEN created END DESC,
    CASE WHEN NOT :descending THEN created END ASC
LIMIT :limit;
""")

QUERY_MAP = {
    'documents': ELEMENT_QUERY,
    'comments': COMMENTS_QUERY,
    'annotations': ANNOTATIONS_QUERY
}

@router.post("/", response_model=SearchResponse, status_code=status.HTTP_200_OK)
def search(query: SearchQuery, db: AsyncSession = Depends(get_db)):
    q = Query(**query.dict())

    try:
        results = []
        
        for query_type in q.searchTypes:
            if QUERY_MAP.get(query_type) is None:
                raise ValueError(f"Unrecognized search type {query_type}")
            
            # Use pgroonga_query for natural language search
            result = db.execute(
                QUERY_MAP.get(query_type), 
                {
                    "query": q.pgroonga_query, 
                    "limit": q.limit, 
                    "descending": q.sortOrder.lower() == 'desc'
                }
            )

            rows = result.fetchall()
            results.extend(rows)

        return {
            "query": query,
            "total_results": len(results),
            "results": [SearchResult(**row._asdict()) for row in results]
        }
    except Exception as e:
        # Handle PGroonga-specific errors
        if "pgroonga" in str(e).lower():
            raise HTTPException(
                status_code=400,
                detail=f"Invalid search query: {query}. PGroonga search error."
            )
        raise HTTPException(
            status_code=500,
            detail=f"Search failed: {str(e)}"
        )
# from fastapi import APIRouter, Depends, HTTPException, status
# from sqlalchemy.ext.asyncio import AsyncSession
# from sqlalchemy import text
# from dotenv import load_dotenv, find_dotenv
# from typing import List

# from sqlalchemy import text
# from sqlalchemy.ext.asyncio import AsyncSession

# from database import get_db
# from models.models import Annotation as AnnotationModel
# from schemas.search import (
#     SearchQuery,
#     SearchResponse,
#     SearchResult
# )

# from dataclasses import dataclass, field
# from typing import List

# @dataclass 
# class Term:
#     type: str
#     term: str
#     group: List['Term'] | None
#     operator: str | None
#     query_fragment: str = field(init=False)

#     OPERATOR_MAP = {
#         'AND': '&',
#         'and': '&',
#         'OR': '|',
#         'or': '|'
#     }
#     TYPES = ('group', 'term')

#     def __post_init__(self):

#         if self.operator is not None and self.operator not in self.OPERATOR_MAP:
#             raise ValueError(f"Only AND and OR operations supported")
        
#         if self.type not in self.TYPES:
#             raise ValueError("Type must be one of 'group' or 'term'")

#         if self.group is not None:
#             self.group = [Term(**term) for term in self.group]

#         self.query_fragment = self._build_fragment()
    
#     def _build_fragment(self):
#         if self.type == 'term':
#             return self._process_term()
        
#         return self._process_group()

#     def _process_term(self):
#         if self.operator is None:
#             return f"'{self.term}'"
        
#         return " ".join([self.OPERATOR_MAP[self.operator], f"'{self.term}'"])
    
#     def _process_group(self):
#         return f"({' '.join([term._build_fragment() for term in self.group])})"


# @dataclass
# class Query:
#     query: str
#     parsedQuery: List[Term]
#     searchTypes: List[str]
#     tags: List[str]
#     sortBy: str
#     sortOrder: str
#     limit: int
#     tsquery: str = field(init=False)
#     def __post_init__(self):
#         if len(self.parsedQuery) == 0:
#             raise ValueError("No elements in parsed query")
#         self.parsedQuery = [Term(**t) for t in self.parsedQuery]

#         if self.parsedQuery[0].operator is not None:
#             raise ValueError("Invalid operand: first term must not have an operator")
        
#         self.tsquery = self._build_tsquery()
        
#     def _build_tsquery(self):
#         return " ".join([term.query_fragment for term in self.parsedQuery])

# load_dotenv(find_dotenv())

# router = APIRouter(
#     prefix="/api/v1/search",
#     tags=["search"],
#     responses={404: {"description": "Annotation not found"}},
# )

# ELEMENT_QUERY = text("""
# WITH ranked_elements AS (
#     select
#     	null as annotation_id,
#         de.id as element_id,
#         de.document_id,
#         d.id as collection_id,
#         de.content ->> 'text' as content,
#         'element' as type,
#         null as motivation,
#         'DocumentElements/' || de.id as source,
#         de.created,
#         ts_rank(
#             to_tsvector('english', de.content::text),
#             to_tsquery('english', :tsq)
#         ) as relevance_score
#     FROM app.document_elements de
#     JOIN app.documents d ON de.document_id  = d.id
#     WHERE to_tsvector('english', de.content::text) @@ to_tsquery('english', :tsq)
# )
# SELECT * FROM ranked_elements
# ORDER BY
#     CASE WHEN :descending THEN relevance_score END DESC,
#     CASE WHEN NOT :descending THEN relevance_score END ASC,
#     CASE WHEN :descending THEN created END DESC,
#     CASE WHEN NOT :descending THEN created END ASC
# LIMIT :limit;
# """)

# COMMENTS_QUERY = text("""
# WITH ranked_annotations AS (
#     select 
#         a.id as annotation_id,
#         split_part(a.target -> 0 ->> 'source', '/', 2)::int as element_id,
#         d.id as document_id,
#         d.id as collection_id,
#         a.body ->> 'value' as content,
#         'annotation' as type,
#         a.target -> 0 ->> 'source' as source,
#         motivation,
#         a.created,
#         ts_rank(
#             to_tsvector('english', a.body ->> 'value'::text), 
#             to_tsquery('english', :tsq)
#         ) as relevance_score
#     from app.annotations a 
#     JOIN app.documents d ON split_part(a.target -> 0 ->> 'source', '/', 2)::int  = d.id
#     WHERE to_tsvector('english', a.body ->> 'value'::text) @@ to_tsquery('english', :tsq)
#     and a.motivation in ('commenting')
# )
# SELECT * FROM ranked_annotations
# ORDER BY 
#     CASE WHEN :descending THEN relevance_score END DESC,
#     CASE WHEN NOT :descending THEN relevance_score END ASC,
#     CASE WHEN :descending THEN created END DESC,
#     CASE WHEN NOT :descending THEN created END ASC
# LIMIT :limit
# ;
# """)

# ANNOTATIONS_QUERY = text("""
# WITH ranked_annotations AS (
#     select 
#         a.id as annotation_id,
#         split_part(a.target -> 0 ->> 'source', '/', 2)::int as element_id,
#         d.id as document_id,
#         d.id as collection_id,
#         a.body ->> 'value' as content,
#         'annotation' as type,
#         a.target -> 0 ->> 'source' as source,
#         motivation,
#         a.created,
#         ts_rank(
#             to_tsvector('english', a.body ->> 'value'::text), 
#             to_tsquery('english', :tsq)
#         ) as relevance_score
#     from app.annotations a 
#     JOIN app.documents d ON split_part(a.target -> 0 ->> 'source', '/', 2)::int  = d.id
#     WHERE to_tsvector('english', a.body ->> 'value'::text) @@ to_tsquery('english', :tsq)
#     and a.motivation in ('scholarly')
# )
# SELECT * FROM ranked_annotations
# ORDER BY 
#     CASE WHEN :descending THEN relevance_score END DESC,
#     CASE WHEN NOT :descending THEN relevance_score END ASC,
#     CASE WHEN :descending THEN created END DESC,
#     CASE WHEN NOT :descending THEN created END ASC
# LIMIT :limit
# ;
# ;
# """)

# QUERY_MAP = {
#     'documents': ELEMENT_QUERY,
#     'comments': COMMENTS_QUERY,
#     'annotations': ANNOTATIONS_QUERY
# }

# @router.post("/",response_model=SearchResponse, status_code=status.HTTP_200_OK)
# def search(query: SearchQuery,
#            db: AsyncSession = Depends(get_db)
#            ):

#     q = Query(**query.dict())

#     print("beginning")
#     try:
#         results = []
        
#         for query_type in q.searchTypes:

#             if QUERY_MAP.get(query_type) is None:
#                 raise ValueError(f"Unrecognized search type {query_type}")
#             result = db.execute(QUERY_MAP.get(query_type), {"tsq": q.tsquery, "limit":q.limit, "descending": q.sortOrder.lower() == 'desc'})

#             rows = result.fetchall()
#             results.extend(rows)

#         return {
#             "query": query,
#             "total_results": len(results),
#             "results": [SearchResult(**row._asdict()) for row in results]
#         }
#     except Exception as e:
#         # Handle PostgreSQL tsquery syntax errors
#         if "syntax error in tsquery" in str(e):
#             raise HTTPException(
#                 status_code=400,
#                 detail=f"Invalid search query syntax: {query}. Please use PostgreSQL tsquery syntax."
#             )
#         raise HTTPException(
#             status_code=500,
#             detail=f"Search failed: {str(e)}"
#         )