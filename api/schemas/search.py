from pydantic import BaseModel, Field
from typing import List, Optional, Literal, Union
from enum import Enum

class SearchType(str, Enum):
    DOCUMENTS = "documents"
    COMMENTS = "comments"
    SCHOLARLY_ANNOTATIONS = "scholarly-annotations"

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

    class Config:
        # Allow forward references for recursive model
        arbitrary_types_allowed = True

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
    tags: List[str] = Field(
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

    class Config:
        # Use enum values in JSON output
        use_enum_values = True
        # Example of the expected JSON structure
        schema_extra = {
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

# Update the forward reference for recursive model
ParsedSearchTerm.model_rebuild()