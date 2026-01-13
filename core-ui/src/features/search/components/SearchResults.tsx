import React, { useState } from "react";
import { SearchResult } from "../types/query";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import AdvancedSettings from "./AdvancedSettings";
import { useLocation, useNavigate } from "react-router-dom";

const styles = {
  container: {
    maxWidth: "800px",
    margin: "0 auto",
    padding: "24px",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  } as React.CSSProperties,

  searchHeader: {
    backgroundColor: "#f8f9fa",
    borderRadius: "8px",
    padding: "24px",
    marginBottom: "24px",
    border: "1px solid #e9ecef",
  } as React.CSSProperties,

  headerTitle: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "16px",
    color: "#212529",
  } as React.CSSProperties,

  searchIcon: {
    width: "24px",
    height: "24px",
    fill: "#648FFF",
  } as React.CSSProperties,

  queryText: {
    fontSize: "24px",
    fontWeight: "500",
    margin: "0 0 8px 0",
    color: "#212529",
  } as React.CSSProperties,

  resultsCount: {
    fontSize: "14px",
    color: "#6c757d",
    margin: "0 0 16px 0",
  } as React.CSSProperties,

  divider: {
    height: "1px",
    backgroundColor: "#dee2e6",
    border: "none",
    margin: "16px 0",
  } as React.CSSProperties,

  queryDetails: {
    display: "flex",
    flexWrap: "wrap",
    gap: "24px",
    alignItems: "flex-start",
  } as React.CSSProperties,

  detailItem: {
    minWidth: "120px",
  } as React.CSSProperties,

  detailLabel: {
    fontSize: "12px",
    color: "#6c757d",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    marginBottom: "4px",
    display: "block",
  } as React.CSSProperties,

  detailValue: {
    fontSize: "14px",
    color: "#212529",
    fontWeight: "500",
  } as React.CSSProperties,

  resultCard: {
    backgroundColor: "#ffffff",
    border: "1px solid #e9ecef",
    borderRadius: "8px",
    padding: "20px",
    marginBottom: "16px",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
    transition: "box-shadow 0.2s ease-in-out",
  } as React.CSSProperties,

  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
  } as React.CSSProperties,

  typeSection: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  } as React.CSSProperties,

  typeIcon: {
    width: "16px",
    height: "16px",
    fill: "#6c757d",
  } as React.CSSProperties,

  typeText: {
    fontSize: "14px",
    color: "#6c757d",
    fontWeight: "500",
  } as React.CSSProperties,

  chip: {
    backgroundColor: "#f8f9fa",
    border: "1px solid #e9ecef",
    borderRadius: "16px",
    padding: "4px 12px",
    fontSize: "12px",
    color: "#495057",
    fontWeight: "500",
  } as React.CSSProperties,

  relevanceText: {
    fontSize: "12px",
    color: "#6c757d",
  } as React.CSSProperties,

  content: {
    fontSize: "16px",
    lineHeight: "1.6",
    color: "#212529",
    marginBottom: "16px",
  } as React.CSSProperties,

  cardFooter: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  } as React.CSSProperties,

  sourceText: {
    fontSize: "12px",
    color: "#6c757d",
  } as React.CSSProperties,

  button: {
    backgroundColor: "transparent",
    border: "none",
    color: "#648FFF",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    padding: "4px 8px",
    borderRadius: "4px",
    transition: "background-color 0.2s",
  } as React.CSSProperties,

  noResults: {
    textAlign: "center",
    padding: "40px 20px",
    color: "#6c757d",
    fontSize: "16px",
    backgroundColor: "#f8f9fa",
    borderRadius: "8px",
    border: "1px solid #e9ecef",
  } as React.CSSProperties,
};

// Utility function to generate route for navigation
const getResultRoute = (result: SearchResult): string => {
  // Base route to document
  let route = `/collections/${result.collection_id}/documents/${result.document_id}`;

  // Add fragment for annotations to enable highlighting later
  if (result.type === "annotation" && result.annotation_id) {
    route += `#annotation-${result.annotation_id}`;
  }

  return route;
};

// Helper function to highlight specific search term in element
const highlightSearchTermInElement = (
  element: HTMLElement,
  searchQuery: string
): boolean => {
  console.log("highlightSearchTermInElement called with query:", searchQuery);

  // The element is the wrapper div, we need to find the actual paragraph with text
  const paragraphElement = element.querySelector(".annotatable-paragraph");
  if (!paragraphElement) {
    console.log("No annotatable-paragraph found");
    return false;
  }

  const textNode = paragraphElement.firstChild;
  if (!textNode || !(textNode instanceof Text)) {
    console.log("No text node found in paragraph");
    return false;
  }

  const text = textNode.textContent || "";
  console.log("Text content:", text.substring(0, 100) + "...");

  // Find the search term (case-insensitive)
  const lowerText = text.toLowerCase();
  const lowerQuery = searchQuery.toLowerCase().trim();

  console.log("Looking for:", lowerQuery);

  const index = lowerText.indexOf(lowerQuery);
  console.log("Index found:", index);

  if (index === -1) {
    console.log("Search term not found in text");
    return false; // Search term not found
  }

  try {
    // Get the paragraph's bounding box (not the wrapper)
    const containerRect = paragraphElement.getBoundingClientRect();

    // Create a range for the matched text
    const range = document.createRange();
    range.setStart(textNode, index);
    range.setEnd(textNode, index + lowerQuery.length);

    // Get all rectangles for the matched text (handles multi-line matches)
    const rects = Array.from(range.getClientRects());

    // Create highlight overlays for each rectangle
    rects.forEach((rect) => {
      const highlight = document.createElement("div");
      highlight.className = "search-result-highlight";
      highlight.style.position = "absolute";
      highlight.style.left = `${rect.left - containerRect.left}px`;
      highlight.style.top = `${rect.top - containerRect.top}px`;
      highlight.style.width = `${rect.width}px`;
      highlight.style.height = `${rect.height}px`;
      highlight.style.backgroundColor = "#ffeb3b";
      highlight.style.opacity = "0.4";
      highlight.style.boxShadow = "0 0 10px rgba(255, 235, 59, 0.5)";
      highlight.style.borderRadius = "2px";
      highlight.style.pointerEvents = "none";
      highlight.style.zIndex = "100";
      highlight.style.transition = "all 0.3s ease";

      // Add to paragraph element (not wrapper)
      paragraphElement.appendChild(highlight);

      // Pulse animation
      setTimeout(() => {
        highlight.style.backgroundColor = "#fff176";
        highlight.style.opacity = "0.5";
      }, 300);

      setTimeout(() => {
        highlight.style.backgroundColor = "#ffeb3b";
        highlight.style.opacity = "0.4";
      }, 600);

      // Remove after animation
      setTimeout(() => {
        highlight.style.opacity = "0";
        setTimeout(() => {
          highlight.remove();
        }, 300);
      }, 2500);
    });

    console.log("Successfully highlighted search term");
    return true;
  } catch (error) {
    console.error("Error highlighting search term:", error);
    return false;
  }
};

// Result Card Component
interface ResultCardProps {
  result: SearchResult;
  searchQuery: string;
}

const ResultCard: React.FC<ResultCardProps> = ({ result, searchQuery }) => {
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();
  const maxLength = 200;
  const shouldTruncate = result.content.length > maxLength;

  const displayContent =
    expanded || !shouldTruncate
      ? result.content
      : result.content.substring(0, maxLength) + "...";

  const handleViewClick = () => {
    console.log("=== SEARCH RESULT VIEW CLICKED ===");
    console.log("Result data:", result);
    console.log("Source URI:", result.source);
    console.log("Search query:", searchQuery);
    console.log("Result type:", result.type);
    console.log("Annotation ID:", result.annotation_id);

    // Navigate to the document first
    const route = getResultRoute(result);
    console.log("Navigating to route:", route);
    navigate(route);

    // After navigation, wait for the document to load, then highlight
    setTimeout(() => {
      console.log("Timeout fired, attempting to highlight");

      // Find the element directly
      const element = document.getElementById(result.source);
      if (!element) {
        console.error("Element not found:", result.source);
        return;
      }

      console.log("Element found, scrolling into view...");

      // Find the actual paragraph element for positioning
      const paragraphElement = element.querySelector(".annotatable-paragraph");

      // Make sure paragraph has position: relative for absolute positioning of highlights
      if (
        paragraphElement &&
        window.getComputedStyle(paragraphElement).position === "static"
      ) {
        (paragraphElement as HTMLElement).style.position = "relative";
      }

      // Scroll the element into view first
      element.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "nearest",
      });

      // Wait a bit for scroll to complete, then apply highlight
      setTimeout(() => {
        console.log("Applying highlight...");

        // For annotations/comments, fetch the annotation and use its selector data
        if (
          (result.type === "annotation" || result.type === "comment") &&
          result.annotation_id
        ) {
          console.log(
            "Looking for annotation highlight:",
            result.annotation_id
          );

          setTimeout(async () => {
            console.log("Fetching annotation data from API...");

            try {
              // Fetch the annotation from the API
              const response = await fetch(
                `/api/v1/annotations/${result.annotation_id}`
              );
              if (!response.ok) {
                throw new Error(
                  `Failed to fetch annotation: ${response.status}`
                );
              }

              const annotationData = await response.json();
              console.log("Annotation data:", annotationData);

              // Find the target for this specific document element
              const target = annotationData.target.find(
                (t: {
                  source: string;
                  selector?: {
                    refined_by: {
                      start: number;
                      end: number;
                    };
                  };
                }) => t.source === result.source
              );

              if (!target || !target.selector) {
                console.log(
                  "No selector found for this element, using fallback"
                );
                const highlighted = highlightSearchTermInElement(
                  element,
                  searchQuery
                );
                if (!highlighted) {
                  highlightWholeElement(element);
                }
                return;
              }

              const { start, end } = target.selector.refined_by;
              console.log(
                `Creating manual highlight at positions ${start}-${end}`
              );

              // Find the paragraph element
              const paragraphElement = element.querySelector(
                ".annotatable-paragraph"
              );
              if (!paragraphElement) {
                console.log("No paragraph element found");
                highlightWholeElement(element);
                return;
              }

              // Make sure paragraph has position: relative
              if (
                window.getComputedStyle(paragraphElement).position === "static"
              ) {
                (paragraphElement as HTMLElement).style.position = "relative";
              }

              const textNode = paragraphElement.firstChild;
              if (!textNode || !(textNode instanceof Text)) {
                console.log("No text node found");
                highlightWholeElement(element);
                return;
              }

              // Create range for the annotated text
              const range = document.createRange();
              range.setStart(textNode, start);
              range.setEnd(textNode, end);

              // Get rectangles for the text (handles multi-line)
              const rects = Array.from(range.getClientRects());
              const containerRect = paragraphElement.getBoundingClientRect();

              console.log(`Creating ${rects.length} highlight overlays`);

              // Create highlight overlays
              rects.forEach((rect) => {
                const highlight = document.createElement("div");
                highlight.className = "search-annotation-highlight";
                highlight.style.position = "absolute";
                highlight.style.left = `${rect.left - containerRect.left}px`;
                highlight.style.top = `${rect.top - containerRect.top}px`;
                highlight.style.width = `${rect.width}px`;
                highlight.style.height = `${rect.height}px`;
                highlight.style.backgroundColor = "#ffeb3b";
                highlight.style.opacity = "0.5";
                highlight.style.boxShadow =
                  "0 0 20px 5px rgba(255, 235, 59, 0.9)";
                highlight.style.borderRadius = "2px";
                highlight.style.pointerEvents = "none";
                highlight.style.zIndex = "1000";
                highlight.style.transition = "all 0.3s ease";

                paragraphElement.appendChild(highlight);

                // Pulse animation
                setTimeout(() => {
                  highlight.style.backgroundColor = "#fff176";
                  highlight.style.opacity = "0.6";
                  highlight.style.boxShadow =
                    "0 0 25px 8px rgba(255, 241, 118, 0.9)";
                }, 300);

                setTimeout(() => {
                  highlight.style.backgroundColor = "#ffeb3b";
                  highlight.style.opacity = "0.5";
                  highlight.style.boxShadow =
                    "0 0 20px 5px rgba(255, 235, 59, 0.9)";
                }, 600);

                // Remove after animation
                setTimeout(() => {
                  highlight.style.opacity = "0";
                  setTimeout(() => {
                    highlight.remove();
                  }, 300);
                }, 2500);
              });

              console.log("Manual annotation highlight created successfully");
            } catch (error) {
              console.error("Error fetching annotation:", error);
              // Fallback
              const highlighted = highlightSearchTermInElement(
                element,
                searchQuery
              );
              if (!highlighted) {
                highlightWholeElement(element);
              }
            }
          }, 1000);
        } else {
          // For document/element results, use search term highlighting
          const highlighted = highlightSearchTermInElement(
            element,
            searchQuery
          );

          if (!highlighted) {
            // Fallback: highlight the whole paragraph if term not found
            console.log("Search term not found, highlighting whole paragraph");
            highlightWholeElement(element);
          }
        }

        console.log("✅ Highlight applied successfully");
      }, 500); // Wait 500ms for scroll animation
    }, 1000); // Wait 1 second for document to load
  };

  // Helper function for whole paragraph highlighting
  const highlightWholeElement = (element: HTMLElement) => {
    const originalBackgroundColor =
      window.getComputedStyle(element).backgroundColor;
    const originalTransition = element.style.transition;
    const originalBoxShadow = element.style.boxShadow;

    element.style.transition = "all 0.3s ease";
    element.style.backgroundColor = "#ffeb3b";
    element.style.boxShadow = "0 0 10px rgba(255, 235, 59, 0.5)";
    element.style.borderRadius = "4px";

    setTimeout(() => {
      element.style.backgroundColor = "#fff176";
    }, 300);

    setTimeout(() => {
      element.style.backgroundColor = "#ffeb3b";
    }, 600);

    setTimeout(() => {
      element.style.backgroundColor = originalBackgroundColor;
      element.style.boxShadow = originalBoxShadow;
      setTimeout(() => {
        element.style.transition = originalTransition;
      }, 300);
    }, 2500);
  };

  const getTypeIcon = (type: string) => {
    const iconProps = { style: styles.typeIcon };

    switch (type.toLowerCase()) {
      case "document":
        return (
          <svg {...iconProps} viewBox="0 0 24 24">
            <path d="M6,2A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2H6Z" />
          </svg>
        );
      case "element":
        return (
          <svg {...iconProps} viewBox="0 0 24 24">
            <path d="M5,5H19V7H5V5M5,9H19V11H5V9M5,13H19V15H5V13M3,17H15V19H3V17M17,17V14L22,18.5L17,23V20H15V17H17Z" />
          </svg>
        );
      case "comment":
        return (
          <svg {...iconProps} viewBox="0 0 24 24">
            <path d="M9,22A1,1 0 0,1 8,21V18H4A2,2 0 0,1 2,16V4C2,2.89 2.9,2 4,2H20A2,2 0 0,1 22,4V16A2,2 0 0,1 20,18H13.9L10.2,21.71C10,21.9 9.75,22 9.5,22V22H9Z" />
          </svg>
        );
      case "annotation":
        return (
          <svg {...iconProps} viewBox="0 0 24 24">
            <path d="M17,3H7A2,2 0 0,0 5,5V21L12,18L19,21V5C19,3.89 18.1,3 17,3Z" />
          </svg>
        );
      default:
        return (
          <svg {...iconProps} viewBox="0 0 24 24">
            <path d="M6,2A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2H6Z" />
          </svg>
        );
    }
  };

  // const formatRelevanceScore = (score: number) => {
  //   return (score * 100).toFixed(1) + "%";
  // };

  return (
    <div
      style={styles.resultCard}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow =
          "0 4px 8px rgba(0, 0, 0, 0.15)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow =
          "0 1px 3px rgba(0, 0, 0, 0.1)";
      }}
    >
      {/* Header */}
      <div style={styles.cardHeader}>
        <div style={styles.typeSection}>
          {getTypeIcon(result.type)}
          <span style={styles.typeText}>
            {result.type.charAt(0).toUpperCase() + result.type.slice(1)}
          </span>
          <span style={styles.chip}>
            ID: {result.annotation_id || result.element_id}
          </span>
        </div>
        {/* <span style={styles.relevanceText}>
          Relevance: {formatRelevanceScore(result.relevance_score)}
        </span> */}
      </div>

      {/* Content */}
      <div style={styles.content}>{displayContent}</div>

      {/* Footer */}
      <div style={styles.cardFooter}>
        <span style={styles.sourceText}>Source: {result.source}</span>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {shouldTruncate && (
            <button
              style={styles.button}
              onClick={() => setExpanded(!expanded)}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor =
                  "#f8f9fa";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor =
                  "transparent";
              }}
            >
              {expanded ? "Show less" : "Show more"}
            </button>
          )}
          <button
            style={{
              ...styles.button,
              backgroundColor: "#648FFF",
              color: "white",
              fontWeight: "500",
            }}
            onClick={handleViewClick}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor =
                "#0056b3";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor =
                "#648FFF";
            }}
          >
            View
          </button>
        </div>
      </div>
    </div>
  );
};

const SearchResultsContainer: React.FC = () => {
  const searchData = useSelector(
    (state: RootState) => state.searchResults.searchResults
  );
  const { query, total_results, results } = searchData;
  const location = useLocation();
  const advanced = location.state?.advanced ?? false;

  const formatSearchTypes = (types: string[]) => {
    return types
      .map((type) => type.charAt(0).toUpperCase() + type.slice(1))
      .join(", ");
  };

  const SearchIcon = () => (
    <svg style={styles.searchIcon} viewBox="0 0 24 24">
      <path d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z" />
    </svg>
  );

  return (
    <div style={styles.container}>
      {/* Search Header */}
      <div style={styles.searchHeader}>
        <div style={styles.headerTitle}>
          <SearchIcon />
          <h1 style={{ fontSize: "24px", fontWeight: "500", margin: 0 }}>
            Search Results
          </h1>
        </div>

        <div>
          <h2 style={styles.queryText}>"{query.query}"</h2>
          <p style={styles.resultsCount}>
            {total_results} result{total_results !== 1 ? "s" : ""} found
          </p>
        </div>

        <hr style={styles.divider} />

        {/* Query Details */}
        <div style={styles.queryDetails}>
          <div style={styles.detailItem}>
            <span style={styles.detailLabel}>Search Types</span>
            <div style={styles.detailValue}>
              {formatSearchTypes(query.searchTypes)}
            </div>
          </div>
          <div style={styles.detailItem}>
            <span style={styles.detailLabel}>Sort By</span>
            <div style={styles.detailValue}>
              {query.sortBy.charAt(0).toUpperCase() + query.sortBy.slice(1)} (
              {query.sortOrder})
            </div>
          </div>
          <div style={styles.detailItem}>
            <span style={styles.detailLabel}>Limit</span>
            <div style={styles.detailValue}>{query.limit} results</div>
          </div>
        </div>
      </div>
      <AdvancedSettings advanced={advanced}></AdvancedSettings>
      <hr style={styles.divider} />
      {/* Results */}
      <div>
        {results.length > 0 ? (
          results.map((result) => (
            <ResultCard
              key={`${result.type}-${
                result.annotation_id || result.element_id
              }`}
              result={result}
              searchQuery={query.query}
            />
          ))
        ) : (
          <div style={styles.noResults}>
            <p>No results found for your search query.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchResultsContainer;
