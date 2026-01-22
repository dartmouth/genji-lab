from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Literal
from enum import Enum
from datetime import datetime

class SearchType(str, Enum):
    DOCUMENTS = "documents"
    COMMENTS = "comments"
    ELEMENTS = 'elements'
    ANNOTATIONS = "annotations"

class SortBy(str, Enum):
    RELEVANCE = "relevance"
    TITLE = "title"
    CREATED = "created"
    MODIFIED = "modified"

class SortOrder(str, Enum):
    ASC = "asc"
    DESC = "desc"

class ParsedSearchTerm(BaseModel):
    type: Literal["term", "group"]
    term: Optional[str] = None
    group: Optional[List["ParsedSearchTerm"]] = None
    operator: Optional[Literal["AND", "OR"]] = None

    model_config= ConfigDict(arbitrary_types_allowed = True)

class SearchQuery(BaseModel):
    query: str = Field(..., description="The raw search query string")
    parsedQuery: List[ParsedSearchTerm] = Field(
        default_factory=list,
        description="Parsed search terms with operators and grouping"
    )
    searchTypes: List[SearchType] = Field(
        default=[SearchType.DOCUMENTS],
        description="Types of content to search in"
    )
    tags: Optional[List[str]] = Field(
        default_factory=list,
        description="Tags to filter by"
    )
    sortBy: SortBy = Field(
        default=SortBy.RELEVANCE,
        description="Field to sort results by"
    )
    sortOrder: SortOrder = Field(
        default=SortOrder.DESC,
        description="Sort order direction"
    )
    limit: int = Field(
        default=50,
        ge=1,
        le=1000,
        description="Maximum number of results to return"
    )

    model_config = ConfigDict(
        # Use enum values in JSON output
        use_enum_values = True,
        # Example of the expected JSON structure
        json_schema_extra = {
            "example": {
                "query": "(python OR java) AND \"machine learning\"",
                "parsedQuery": [
                    {
                        "type": "group",
                        "group": [
                            {
                                "type": "term",
                                "term": "python",
                                "operator": None
                            },
                            {
                                "type": "term",
                                "term": "java",
                                "operator": "OR"
                            }
                        ],
                        "operator": None
                    },
                    {
                        "type": "term",
                        "term": "machine learning",
                        "operator": "AND"
                    }
                ],
                "searchTypes": ["documents", "comments"],
                "tags": ["ai", "tutorial"],
                "sortBy": "relevance",
                "sortOrder": "desc",
                "limit": 50
            }
        }
        )

# Update the forward reference for recursive model
ParsedSearchTerm.model_rebuild()

class SearchResult(BaseModel):
    annotation_id: Optional[int] = Field(None, description="ID of the annotation (for annotation results)")
    element_id: Optional[int] = Field(None, description="ID of the document element")
    document_id: int = Field(..., description="ID of the document")
    collection_id: int = Field(..., description="ID of the collection")
    content: str = Field(..., description="The text content of the result")
    type: str = Field(..., description="Type of result (annotation, element, etc.)")
    source: str = Field(..., description="Source reference/path")
    motivation: Optional[str] = Field(None, description="Motivation for annotations (e.g., 'commenting')")
    created: datetime = Field(..., description="Creation timestamp")
    relevance_score: float = Field(..., description="Text search relevance score")

class SearchResponse(BaseModel):
    query: SearchQuery
    total_results: int
    results: List[SearchResult]