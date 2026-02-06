# services/search_service.py

from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field
from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text

from services.base_service import BaseService
from models.models import Annotation as AnnotationModel


@dataclass
class Term:
    """Represents a search term or group of terms."""

    type: str
    term: str
    group: List["Term"] | None
    operator: str | None

    OPERATOR_MAP = {"AND": "AND", "and": "AND", "OR": "OR", "or": "OR"}
    TYPES = ("group", "term")

    def __post_init__(self):
        if self.operator is not None and self.operator not in self.OPERATOR_MAP:
            raise ValueError("Only AND and OR operations supported")

        if self.type not in self.TYPES:
            raise ValueError("Type must be one of 'group' or 'term'")

        if self.group is not None:
            self.group = [Term(**term) for term in self.group]


@dataclass
class Query:
    """Represents a parsed search query."""

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

    def _build_pgroonga_query(self) -> str:
        """Convert structured query to natural language format for PGroonga."""
        parts = []
        for term in self.parsedQuery:
            if term.type == "term":
                if term.operator:
                    parts.append(term.operator.upper())
                parts.append(term.term)
            elif term.type == "group":
                # Flatten groups into natural language
                group_parts = []
                for group_term in term.group:
                    if group_term.operator:
                        group_parts.append(group_term.operator.upper())
                    group_parts.append(group_term.term)
                parts.append(f"({' '.join(group_parts)})")

        return " ".join(parts)


class SearchService(BaseService[AnnotationModel]):
    """Service for search operations using PGroonga full-text search."""

    # SQL queries for different search types
    ELEMENT_QUERY = text(
        """
    WITH ranked_elements AS (
        SELECT
            null as annotation_id,
            de.id as element_id,
            de.document_id,
            d.document_collection_id as collection_id,
            de.content ->> 'text' as content,
            d.title as document_title,
            dc.title as collection_title,
            'element' as type,
            null as motivation,
            'DocumentElements/' || de.id as source,
            de.created,
            pgroonga_score(de.tableoid, de.ctid) as relevance_score
        FROM app.document_elements de
        JOIN app.documents d ON de.document_id = d.id
        JOIN app.document_collections dc on d.document_collection_id = dc.id
        WHERE (de.content->>'text') &@~ :query
    )
    SELECT * FROM ranked_elements
    ORDER BY
        CASE WHEN :descending THEN relevance_score END DESC,
        CASE WHEN NOT :descending THEN relevance_score END ASC,
        CASE WHEN :descending THEN created END DESC,
        CASE WHEN NOT :descending THEN created END ASC
    LIMIT :limit;
    """
    )

    COMMENTS_QUERY = text(
        """
    WITH ranked_annotations AS (
        SELECT 
            a.id as annotation_id,
            split_part(a.target -> 0 ->> 'source', '/', 2)::int as element_id,
            d.id as document_id,
            d.document_collection_id as collection_id,
            a.body ->> 'value' as content,
            d.title as document_title,
            dc.title as collection_title,
            'annotation' as type,
            a.target -> 0 ->> 'source' as source,
            motivation,
            a.created,
            pgroonga_score(a.tableoid, a.ctid) as relevance_score
        FROM app.annotations a 
        JOIN app.documents d ON split_part(a.target -> 0 ->> 'source', '/', 2)::int = d.id
        JOIN app.document_collections dc on d.document_collection_id = dc.id
        WHERE (a.body->>'value') &@~ :query
        AND a.motivation IN ('commenting')
        AND (
            (:classroom_id IS NULL AND a.classroom_id IS NULL) OR
            (a.classroom_id = :classroom_id)
        )
    )
    SELECT * FROM ranked_annotations
    ORDER BY 
        CASE WHEN :descending THEN relevance_score END DESC,
        CASE WHEN NOT :descending THEN relevance_score END ASC,
        CASE WHEN :descending THEN created END DESC,
        CASE WHEN NOT :descending THEN created END ASC
    LIMIT :limit;
    """
    )

    ANNOTATIONS_QUERY = text(
        """
    WITH ranked_annotations AS (
        SELECT 
            a.id as annotation_id,
            split_part(a.target -> 0 ->> 'source', '/', 2)::int as element_id,
            de.document_id as document_id,
            d.document_collection_id as collection_id,
            a.body ->> 'value' as content,
            d.title as document_title,
            dc.title as collection_title,
            'annotation' as type,
            a.target -> 0 ->> 'source' as source,
            motivation,
            a.created,
            pgroonga_score(a.tableoid, a.ctid) as relevance_score
        FROM app.annotations a 
        JOIN app.document_elements de ON split_part(a.target -> 0 ->> 'source', '/', 2)::int = de.id
        JOIN app.documents d ON de.document_id = d.id
        JOIN app.document_collections dc on d.document_collection_id = dc.id
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
    """
    )

    QUERY_MAP = {
        "documents": ELEMENT_QUERY,
        "comments": COMMENTS_QUERY,
        "annotations": ANNOTATIONS_QUERY,
    }

    def __init__(self):
        super().__init__(AnnotationModel)

    # ==================== Helper Methods ====================

    def _parse_query(self, query_dict: Dict[str, Any]) -> Query:
        """
        Parse and validate a search query.

        Raises HTTPException 400 if query is invalid.
        """
        try:
            return Query(**query_dict)
        except ValueError as e:
            raise HTTPException(
                status_code=400, detail=f"Invalid search query: {str(e)}"
            )

    def _get_query_for_type(self, query_type: str):
        """
        Get the SQL query for a search type.

        Raises HTTPException 400 if search type is unrecognized.
        """
        sql_query = self.QUERY_MAP.get(query_type)
        if sql_query is None:
            raise HTTPException(
                status_code=400, detail=f"Unrecognized search type: {query_type}"
            )
        return sql_query

    def _execute_search_query(
        self,
        db: Session,
        sql_query,
        pgroonga_query: str,
        limit: int,
        descending: bool,
        classroom_id: Optional[int] = None,
    ) -> List[Any]:
        """Execute a single search query and return results."""
        result = db.execute(
            sql_query,
            {
                "query": pgroonga_query,
                "limit": limit,
                "descending": descending,
                "classroom_id": classroom_id,
            },
        )
        return result.fetchall()

    # ==================== Search Operations ====================

    def search(
        self,
        db: Session,
        query_dict: Dict[str, Any],
        classroom_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Execute a full-text search across specified content types.
        Filters classroom-specific content (comments) by classroom_id.
        Replies are not searched - they inherit visibility from parent comments.
        """
        # Parse and validate the query
        parsed_query = self._parse_query(query_dict)
        descending = parsed_query.sortOrder.lower() == "desc"

        try:
            results = []

            for query_type in parsed_query.searchTypes:
                sql_query = self._get_query_for_type(query_type)

                rows = self._execute_search_query(
                    db=db,
                    sql_query=sql_query,
                    pgroonga_query=parsed_query.pgroonga_query,
                    limit=parsed_query.limit,
                    descending=descending,
                    classroom_id=classroom_id,
                )
                results.extend(rows)

            return {
                "query": query_dict,
                "total_results": len(results),
                "results": [row._asdict() for row in results],
            }

        except HTTPException:
            raise
        except Exception as e:
            if "pgroonga" in str(e).lower():
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid search query. PGroonga search error.",
                )
            raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


# Singleton instance for easy importing
search_service = SearchService()
