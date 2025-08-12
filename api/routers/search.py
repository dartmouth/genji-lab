
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

from tools import tsquery_generator

load_dotenv(find_dotenv())

router = APIRouter(
    prefix="/api/v1/search",
    tags=["search"],
    responses={404: {"description": "Annotation not found"}},
)

ELEMENT_QUERY = text("""
WITH ranked_elements AS (
    select
    	null as annotation_id,
        de.id as element_id,
        de.document_id,
        d.id as collection_id,
        de.content ->> 'text' as content,
        'element' as type,
        null as motivation,
        'DocumentElements/' || de.id as source,
        de.created,
        ts_rank(
            to_tsvector('english', de.content::text),
            to_tsquery('english', :tsq)
        ) as relevance_score
    FROM app.document_elements de
    JOIN app.documents d ON de.document_id  = d.id
    WHERE to_tsvector('english', de.content::text) @@ to_tsquery('english', :tsq)
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
    select 
        a.id as annotation_id,
        split_part(a.target -> 0 ->> 'source', '/', 2)::int as element_id,
        d.id as document_id,
        d.id as collection_id,
        a.body ->> 'value' as content,
        'annotation' as type,
        a.target -> 0 ->> 'source' as source,
        motivation,
        a.created,
        ts_rank(
            to_tsvector('english', a.body ->> 'value'::text), 
            to_tsquery('english', :tsq)
        ) as relevance_score
    from app.annotations a 
    JOIN app.documents d ON split_part(a.target -> 0 ->> 'source', '/', 2)::int  = d.id
    WHERE to_tsvector('english', a.body ->> 'value'::text) @@ to_tsquery('english', :tsq)
    and a.motivation in ('commenting')
)
SELECT * FROM ranked_annotations
ORDER BY 
    CASE WHEN :descending THEN relevance_score END DESC,
    CASE WHEN NOT :descending THEN relevance_score END ASC,
    CASE WHEN :descending THEN created END DESC,
    CASE WHEN NOT :descending THEN created END ASC
LIMIT :limit
;
""")

ANNOTATIONS_QUERY = text("""
WITH ranked_annotations AS (
    select 
        a.id as annotation_id,
        split_part(a.target -> 0 ->> 'source', '/', 2)::int as element_id,
        d.id as document_id,
        d.id as collection_id,
        a.body ->> 'value' as content,
        'annotation' as type,
        a.target -> 0 ->> 'source' as source,
        motivation,
        a.created,
        ts_rank(
            to_tsvector('english', a.body ->> 'value'::text), 
            to_tsquery('english', :tsq)
        ) as relevance_score
    from app.annotations a 
    JOIN app.documents d ON split_part(a.target -> 0 ->> 'source', '/', 2)::int  = d.id
    WHERE to_tsvector('english', a.body ->> 'value'::text) @@ to_tsquery('english', :tsq)
    and a.motivation in ('scholarly')
)
SELECT * FROM ranked_annotations
ORDER BY 
    CASE WHEN :descending THEN relevance_score END DESC,
    CASE WHEN NOT :descending THEN relevance_score END ASC,
    CASE WHEN :descending THEN created END DESC,
    CASE WHEN NOT :descending THEN created END ASC
LIMIT :limit
;
;
""")

QUERY_MAP = {
    'documents': ELEMENT_QUERY,
    'comments': COMMENTS_QUERY,
    'annotations': ANNOTATIONS_QUERY
}

@router.post("/",response_model=SearchResponse, status_code=status.HTTP_200_OK)
def search(query: SearchQuery,
           db: AsyncSession = Depends(get_db)
           ):

    q = tsquery_generator.Query(**query.dict())

    print("beginning")
    try:
        results = []
        
        for query_type in q.searchTypes:

            if QUERY_MAP.get(query_type) is None:
                raise ValueError(f"Unrecognized search type {query_type}")
            result = db.execute(QUERY_MAP.get(query_type), {"tsq": q.tsquery, "limit":q.limit, "descending": q.sortOrder.lower() == 'desc'})

            rows = result.fetchall()
            results.extend(rows)

        return {
            "query": query,
            "total_results": len(results),
            "results": [SearchResult(**row._asdict()) for row in results]
        }
    except Exception as e:
        # Handle PostgreSQL tsquery syntax errors
        if "syntax error in tsquery" in str(e):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid search query syntax: {query}. Please use PostgreSQL tsquery syntax."
            )
        raise HTTPException(
            status_code=500,
            detail=f"Search failed: {str(e)}"
        )