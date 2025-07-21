from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from sqlalchemy.orm import joinedload
from datetime import datetime
from collections import defaultdict
from typing import Dict, List
from dotenv import load_dotenv, find_dotenv
import os

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.models import Annotation as AnnotationModel
from schemas.search import (
    SearchQuery
)
from tools import tsquery_generator

load_dotenv(find_dotenv())

router = APIRouter(
    prefix="/api/v1/search",
    tags=["search"],
    responses={404: {"description": "Annotation not found"}},
)

# List[Annotation]
@router.get("/", status_code=status.HTTP_200_OK)
def read_annotations(query: SearchQuery,
                     db: AsyncSession = Depends(get_db)
                     ):

    q = tsquery_generator.Query(**query.dict())
    search_sql = text("""
        SELECT 
            de.id,
            de.content ->> 'text' as content,
            'element' as type,
            null as motivation,
            'DocumentElements/' || de.id as source,
            ts_rank(
                to_tsvector('english', de.content::text), 
                to_tsquery('english', :tsq)
            ) as rank
        FROM app.document_elements de
        WHERE to_tsvector('english', de.content::text) @@ to_tsquery('english', :tsq)
        ORDER BY rank DESC, de.created DESC
        LIMIT :limit
    """)

    annotation_sql = text("""
    select 
        a.id, 
        a.body ->> 'value' as content,
        'annotation' as type,
        a.target -> 0 ->> 'source' as source,
        motivation,
            ts_rank(
            to_tsvector('english', a.body ->> 'value'::text), 
            to_tsquery('english', :tsq)
        ) as rank
    from app.annotations a 
    WHERE to_tsvector('english', a.body ->> 'value'::text) @@ to_tsquery('english', :tsq)
    and a.motivation in ('commenting', 'scholarly')
    ORDER BY rank DESC, a.generated DESC
    LIMIT :limit
    ;
    """)
    all_queries = [search_sql, annotation_sql]
    print("beginning")
    try:
        results = []
        for search_query in all_queries:
            print("executing query")
            result = db.execute(search_query, {"tsq": q.tsquery, "limit":q.limit})
            rows = result.fetchall()
            results.extend(rows)
        
        # Convert results to a more structured format
        search_results = []
        for row in results:
            search_results.append({
                "id": row.id,
                "content": row.content,
                "motivation": row.motivation,
                "source": row.source,
                "type": row.type,
                "relevance_score": float(row.rank)
            })
        
        return {
            "query": query,
            "total_results": len(search_results),
            "results": search_results
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