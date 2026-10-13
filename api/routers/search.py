from fastapi import APIRouter, Depends, status, Query as QueryParam
from sqlalchemy.orm import Session
from typing import Optional

from database import get_db
from dependencies.classroom import get_current_user_sync
from models.models import User
from schemas.search import SearchQuery, SearchResponse, SearchResult
from services.search_service import search_service

router = APIRouter(
    prefix="/api/v1/search",
    tags=["search"],
    responses={404: {"description": "Annotation not found"}},
)


@router.post("/", response_model=SearchResponse, status_code=status.HTTP_200_OK)
def search(
    query: SearchQuery,
    classroom_id: Optional[int] = QueryParam(
        None, description="Filter classroom-specific content"
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_sync),
):
    """
    Execute a full-text search across documents, comments, and annotations.

    Uses PGroonga for multilingual full-text search with fuzzy matching.
    Filters comments by classroom context if provided.
    """
    result = search_service.search(
        db=db, query_dict=query.dict(), classroom_id=classroom_id
    )

    # Convert results to SearchResult objects for response model
    return SearchResponse(
        query=query,
        total_results=result["total_results"],
        results=[SearchResult(**row) for row in result["results"]],
    )
