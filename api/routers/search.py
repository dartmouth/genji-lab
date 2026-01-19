from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from database import get_db
from schemas.search import (
    SearchQuery,
    SearchResponse,
    SearchResult
)
from services.search_service import search_service

router = APIRouter(
    prefix="/api/v1/search",
    tags=["search"],
    responses={404: {"description": "Annotation not found"}},
)


@router.post("/", response_model=SearchResponse, status_code=status.HTTP_200_OK)
def search(
    query: SearchQuery,
    db: Session = Depends(get_db)
):
    """
    Execute a full-text search across documents, comments, and annotations.
    
    Uses PGroonga for multilingual full-text search with fuzzy matching.
    """
    result = search_service.search(db, query.dict())
    
    # Convert results to SearchResult objects for response model
    return SearchResponse(
        query=query,
        total_results=result["total_results"],
        results=[SearchResult(**row) for row in result["results"]]
    )
