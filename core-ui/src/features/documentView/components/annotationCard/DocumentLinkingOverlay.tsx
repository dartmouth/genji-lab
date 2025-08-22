// src/features/documentView/components/annotationCard/DocumentLinkingOverlay.tsx
import React, { useState, useEffect, useRef } from "react";
import { useAppDispatch } from "@store/hooks";
import { useAuth } from "@hooks/useAuthContext";
import { linkingAnnotations } from "@store";
import { makeTextAnnotationBody } from "@documentView/utils";
import {
  Link as LinkIcon,
  Close as CloseIcon,
  Check as CheckIcon,
} from "@mui/icons-material";

interface ElementSelection {
  documentElementId: number;
  sourceURI: string;
  text: string;
  start: number;
  end: number;
}

interface MultiElementSelection {
  documentId: number;
  elements: ElementSelection[];
  fullText: string;
}

interface DocumentLinkingOverlayProps {
  documents: Array<{
    id: number;
    collectionId: number;
    title: string;
  }>;
  onClose: () => void;
}

const DocumentLinkingOverlay: React.FC<DocumentLinkingOverlayProps> = ({
  documents,
  onClose,
}) => {
  const dispatch = useAppDispatch();
  const { user, isAuthenticated } = useAuth();

  const [firstSelection, setFirstSelection] =
    useState<MultiElementSelection | null>(null);
  const [secondSelection, setSecondSelection] =
    useState<MultiElementSelection | null>(null);
  const [currentStep, setCurrentStep] = useState<
    "first" | "second" | "confirm"
  >("first");
  const [description, setDescription] = useState("");

  // Add a ref to prevent double processing
  const lastProcessedText = useRef<string>("");

  // Helper function to safely extract numeric ID from element ID
  const extractNumericId = (elementId: string): string | null => {
    let numericId: string;

    if (elementId.startsWith("DocumentElements/")) {
      numericId = elementId.substring("DocumentElements/".length);
    } else if (elementId.includes("/DocumentElements/")) {
      const match = elementId.match(/\/DocumentElements\/(\d+)$/);
      numericId = match ? match[1] : "";
    } else {
      console.warn("Unexpected element ID format:", elementId);
      return null;
    }

    // Validate that we got a valid numeric ID
    if (!numericId || isNaN(parseInt(numericId))) {
      console.warn("Invalid numeric ID extracted:", { elementId, numericId });
      return null;
    }

    console.log("Successfully extracted numeric ID:", { elementId, numericId });
    return numericId;
  };

  // Function to analyze a DOM selection and extract all involved elements
  const analyzeMultiElementSelection = (
    range: Range
  ): MultiElementSelection | null => {
    console.log("Analyzing multi-element selection"); // DEBUG
    console.log("Range details:", {
      startContainer: range.startContainer,
      endContainer: range.endContainer,
      startOffset: range.startOffset,
      endOffset: range.endOffset,
      commonAncestor: range.commonAncestorContainer,
    });

    const selectedText = range.toString().trim();
    if (selectedText.length === 0) return null;

    console.log(
      "Selected text:",
      selectedText.substring(0, 100) + (selectedText.length > 100 ? "..." : "")
    );

    // Find all document elements that intersect with the selection
    const elementSelections: ElementSelection[] = [];

    // Alternative approach: Start from the range boundaries and find DocumentElement ancestors
    const startElement =
      range.startContainer.nodeType === Node.ELEMENT_NODE
        ? (range.startContainer as HTMLElement)
        : (range.startContainer.parentElement as HTMLElement);
    const endElement =
      range.endContainer.nodeType === Node.ELEMENT_NODE
        ? (range.endContainer as HTMLElement)
        : (range.endContainer.parentElement as HTMLElement);

    console.log("Start and end elements:", {
      startElement: startElement?.tagName + "#" + startElement?.id,
      endElement: endElement?.tagName + "#" + endElement?.id,
    });

    // Find all DocumentElement containers that might be involved
    const documentElements = new Set<HTMLElement>();

    // Method 1: Tree walker approach (original)
    const commonAncestor = range.commonAncestorContainer;
    const walker = window.document.createTreeWalker(
      commonAncestor,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node: Node) => {
          if (range.intersectsNode(node)) {
            return NodeFilter.FILTER_ACCEPT;
          }
          return NodeFilter.FILTER_REJECT;
        },
      }
    );

    let textNode = walker.nextNode() as Text;
    while (textNode) {
      let parentElement = textNode.parentElement;
      while (parentElement && !parentElement.id?.includes("DocumentElements")) {
        parentElement = parentElement.parentElement;
      }

      if (parentElement && parentElement.id?.includes("DocumentElements")) {
        documentElements.add(parentElement);
      }

      textNode = walker.nextNode() as Text;
    }

    // Method 2: Direct ancestor traversal from start/end points
    [startElement, endElement].forEach((element) => {
      if (element) {
        let current: HTMLElement | null = element;
        while (current && current !== document.body) {
          if (current.id?.includes("DocumentElements")) {
            documentElements.add(current);
            break;
          }
          current = current.parentElement;
        }
      }
    });

    // Method 3: Query selector within the common ancestor
    if (commonAncestor.nodeType === Node.ELEMENT_NODE) {
      const ancestorElement = commonAncestor as HTMLElement;
      const foundElements = ancestorElement.querySelectorAll(
        '[id*="DocumentElements"]'
      );
      foundElements.forEach((el) => {
        if (range.intersectsNode(el)) {
          documentElements.add(el as HTMLElement);
        }
      });
    }

    console.log(
      "Found DocumentElements:",
      Array.from(documentElements).map((el) => el.id)
    );

    // If we still haven't found any elements, try a broader search
    if (documentElements.size === 0) {
      console.log(
        "No elements found with primary methods, trying broader search..."
      );

      // Get all DocumentElements in the document and check intersection
      const allDocElements = document.querySelectorAll(
        '[id*="DocumentElements"]'
      );
      console.log("Total DocumentElements in document:", allDocElements.length);

      allDocElements.forEach((element) => {
        try {
          if (range.intersectsNode(element)) {
            console.log("Found intersecting element:", element.id);
            documentElements.add(element as HTMLElement);
          }
        } catch (error) {
          console.error(
            error,
            "Error checking intersection for element:",
            element.id
          );
        }
      });
    }

    if (documentElements.size === 0) {
      console.warn("No DocumentElements found for selection");
      return null;
    }

    console.log(
      "Final DocumentElements to process:",
      Array.from(documentElements).map((el) => el.id)
    );

    // Process each DocumentElement to calculate precise text ranges
    documentElements.forEach((element) => {
      const elementId = element.id;

      // Extract numeric ID safely
      const numericId = extractNumericId(elementId);
      if (!numericId) {
        console.warn("Skipping element with invalid ID:", elementId);
        return;
      }

      console.log("Processing element:", { elementId, numericId }); // DEBUG

      // Get the element's text content
      const elementText = element.textContent || "";

      if (elementText.length === 0) {
        console.warn("Element has no text content:", elementId);
        return;
      }

      // Find where the selected text intersects with this element's text
      let intersectionText = "";
      let elementStart = -1;
      let elementEnd = -1;

      try {
        // Create intersection range for this specific element
        const elementRange = window.document.createRange();
        elementRange.selectNodeContents(element);

        // Check if there's actually an intersection
        if (!range.intersectsNode(element)) {
          console.log("Range does not intersect element:", elementId);
          return;
        }

        // Calculate the intersection between the selection and this element
        const intersectionRange = window.document.createRange();

        // Set intersection start
        if (
          range.compareBoundaryPoints(Range.START_TO_START, elementRange) >= 0
        ) {
          intersectionRange.setStart(range.startContainer, range.startOffset);
        } else {
          intersectionRange.setStart(
            elementRange.startContainer,
            elementRange.startOffset
          );
        }

        // Set intersection end
        if (range.compareBoundaryPoints(Range.END_TO_END, elementRange) <= 0) {
          intersectionRange.setEnd(range.endContainer, range.endOffset);
        } else {
          intersectionRange.setEnd(
            elementRange.endContainer,
            elementRange.endOffset
          );
        }

        intersectionText = intersectionRange.toString().trim();

        console.log(
          "Intersection text for element",
          elementId,
          ":",
          intersectionText.substring(0, 50) + "..."
        );

        if (intersectionText.length > 0) {
          // Find the position of this text within the element
          elementStart = elementText.indexOf(intersectionText);
          if (elementStart !== -1) {
            elementEnd = elementStart + intersectionText.length;
          } else {
            // Enhanced fallback with multiple search strategies
            const searchTexts = [
              intersectionText.trim(),
              intersectionText.length > 50
                ? intersectionText.substring(0, 50)
                : intersectionText,
              intersectionText.length > 20
                ? intersectionText.substring(0, 20)
                : intersectionText,
              // Try the last part of the text too
              intersectionText.length > 50
                ? intersectionText.substring(intersectionText.length - 50)
                : null,
            ].filter((text) => text && text.length > 0);

            for (const searchText of searchTexts) {
              if (!searchText) continue;

              elementStart = elementText.indexOf(searchText);
              if (elementStart !== -1) {
                // Use the length of the original intersection text, not the search text
                elementEnd =
                  elementStart +
                  Math.min(
                    intersectionText.length,
                    elementText.length - elementStart
                  );
                intersectionText = elementText.substring(
                  elementStart,
                  elementEnd
                );
                console.log(
                  "Found text using fallback search:",
                  searchText.substring(0, 30) + "..."
                );
                break;
              }
            }

            // If still not found, try a character-by-character approach for Unicode text
            if (elementStart === -1 && intersectionText.length > 10) {
              // For non-ASCII text, try finding any substantial substring
              for (let i = 0; i < intersectionText.length - 10; i += 5) {
                const substring = intersectionText.substring(i, i + 10);
                const foundIndex = elementText.indexOf(substring);
                if (foundIndex !== -1) {
                  elementStart = foundIndex;
                  // Extend the range to include more context
                  elementEnd = Math.min(
                    foundIndex + intersectionText.length,
                    elementText.length
                  );
                  intersectionText = elementText.substring(
                    elementStart,
                    elementEnd
                  );
                  console.log("Found text using substring search:", substring);
                  break;
                }
              }
            }
          }
        }
      } catch (rangeError) {
        console.warn(
          "Range calculation failed for element:",
          elementId,
          rangeError
        );

        // Ultimate fallback: try simple text search
        const searchOptions = [
          selectedText,
          selectedText.trim(),
          selectedText.length > 50
            ? selectedText.substring(0, 50)
            : selectedText,
        ];

        for (const searchText of searchOptions) {
          if (elementText.includes(searchText)) {
            elementStart = elementText.indexOf(searchText);
            elementEnd = elementStart + searchText.length;
            intersectionText = searchText;
            console.log(
              "Found text using ultimate fallback:",
              searchText.substring(0, 30) + "..."
            );
            break;
          }
        }
      }

      if (
        intersectionText.length > 0 &&
        elementStart >= 0 &&
        elementEnd > elementStart &&
        elementEnd <= elementText.length
      ) {
        console.log(`Element ${numericId} selection:`, {
          text:
            intersectionText.substring(0, 50) +
            (intersectionText.length > 50 ? "..." : ""),
          start: elementStart,
          end: elementEnd,
          elementTextLength: elementText.length,
          isValidRange:
            elementStart >= 0 &&
            elementEnd <= elementText.length &&
            elementStart < elementEnd,
        }); // DEBUG

        elementSelections.push({
          documentElementId: parseInt(numericId),
          sourceURI: `/DocumentElements/${numericId}`, // Consistent format with leading slash
          text: intersectionText,
          start: elementStart,
          end: elementEnd,
        });
      } else {
        console.warn(
          `Failed to calculate valid range for element ${numericId}:`,
          {
            intersectionTextLength: intersectionText.length,
            elementStart,
            elementEnd,
            elementTextLength: elementText.length,
            elementId,
            isValidRange:
              elementStart >= 0 &&
              elementEnd <= elementText.length &&
              elementStart < elementEnd,
            issue:
              elementStart < 0
                ? "negative start"
                : elementEnd > elementText.length
                ? "end beyond text"
                : elementStart >= elementEnd
                ? "start >= end"
                : "unknown",
          }
        );

        // Skip this element rather than creating invalid data
        return;
      }
    });

    if (elementSelections.length === 0) {
      return null;
    }

    // Find which document this belongs to - use the first element found
    const firstElement = Array.from(documentElements)[0];
    if (!firstElement) return null;

    const documentPanel = firstElement.closest(
      ".document-panel-wrapper"
    ) as HTMLElement;
    if (!documentPanel) {
      console.warn("No document panel found for element");
      return null;
    }

    const documentId = parseInt(
      documentPanel.getAttribute("data-document-id") || "0"
    );
    const foundDocument = documents.find((d) => d.id === documentId);

    if (!foundDocument) {
      console.warn("Document not found in current view:", documentId);
      return null;
    }

    console.log("Multi-element selection created:", {
      documentId: foundDocument.id,
      documentTitle: foundDocument.title,
      elements: elementSelections.length,
      fullText:
        selectedText.substring(0, 100) +
        (selectedText.length > 100 ? "..." : ""),
    }); // DEBUG

    return {
      documentId: foundDocument.id,
      elements: elementSelections,
      fullText: selectedText,
    };
  };

  // Listen for text selections
  useEffect(() => {
    const handleSelection = (e: MouseEvent) => {
      console.log("DocumentLinkingOverlay: Selection event captured"); // DEBUG
      console.log("DocumentLinkingOverlay: Current step:", currentStep); // DEBUG
      console.log(
        "DocumentLinkingOverlay: First selection:",
        firstSelection?.documentId
      ); // DEBUG

      // Prevent event from being handled by other components
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        return;
      }

      const range = selection.getRangeAt(0);
      const selectedText = range.toString().trim();

      if (selectedText.length === 0) return;

      // Prevent double processing of the same text
      if (selectedText === lastProcessedText.current) {
        return;
      }
      lastProcessedText.current = selectedText;

      // Analyze the selection for multiple elements
      const multiElementSelection = analyzeMultiElementSelection(range);

      if (!multiElementSelection) {
        return;
      }

      if (currentStep === "first") {
        setFirstSelection(multiElementSelection);
        setCurrentStep("second");
      } else if (currentStep === "second") {
        // Ensure we're not linking within the same document
        if (
          firstSelection &&
          multiElementSelection.documentId === firstSelection.documentId
        ) {
          return;
        }
        setSecondSelection(multiElementSelection);
        setCurrentStep("confirm");
      }

      // Clear the selection
      selection.removeAllRanges();

      // Reset the duplicate prevention after a short delay
      setTimeout(() => {
        lastProcessedText.current = "";
      }, 500);
    };

    const handleMouseDown = (e: MouseEvent) => {
      // Prevent HighlightedText from handling this
      e.stopPropagation();
      e.stopImmediatePropagation();
    };

    // Use capture phase to intercept before HighlightedText
    document.addEventListener("mousedown", handleMouseDown, true);
    document.addEventListener("mouseup", handleSelection, true);

    return () => {
      document.removeEventListener("mousedown", handleMouseDown, true);
      document.removeEventListener("mouseup", handleSelection, true);
    };
  }, [currentStep, firstSelection, documents]);

  const handleSaveLink = () => {
    if (!user || !isAuthenticated || !firstSelection || !secondSelection) {
      return;
    }

    // Create segments for all elements in both selections
    const segments = [
      // First selection segments
      ...firstSelection.elements.map((element) => ({
        sourceURI: element.sourceURI,
        start: element.start,
        end: element.end,
        text: element.text,
      })),
      // Second selection segments
      ...secondSelection.elements.map((element) => ({
        sourceURI: element.sourceURI,
        start: element.start,
        end: element.end,
        text: element.text,
      })),
    ];

    // Use the first document's collection and element for the main annotation body
    const annoBody = makeTextAnnotationBody(
      documents[0].collectionId,
      firstSelection.documentId,
      firstSelection.elements[0].documentElementId,
      user.id,
      "linking",
      description || "Document link",
      segments
    );

    dispatch(linkingAnnotations.thunks.saveAnnotation(annoBody));
    onClose();
  };

  const handleReset = () => {
    setFirstSelection(null);
    setSecondSelection(null);
    setCurrentStep("first");
    setDescription("");
    lastProcessedText.current = ""; // Reset duplicate prevention
  };

  const getDocumentTitle = (docId: number) => {
    return documents.find((d) => d.id === docId)?.title || `Document ${docId}`;
  };

  const getStepInstruction = () => {
    switch (currentStep) {
      case "first":
        return "Select text in the first document";
      case "second":
        return "Select corresponding text in the second document";
      case "confirm":
        return "Review your selections and save the link";
      default:
        return "";
    }
  };

  // Helper to get a preview of multi-element selection
  const getSelectionPreview = (selection: MultiElementSelection) => {
    return (
      selection.fullText.substring(0, 100) +
      (selection.fullText.length > 100 ? "..." : "")
    );
  };

  return (
    <>
      {/* Document highlighting overlay - shows which areas can be selected */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: "none",
          zIndex: 5,
          background: "rgba(25, 118, 210, 0.05)",
        }}
      />

      {/* Floating control panel */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          right: "20px",
          transform: "translateY(-50%)",
          backgroundColor: "white",
          borderRadius: "8px",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
          padding: "20px",
          width: "320px",
          zIndex: 1000,
          border: "2px solid #1976d2",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: "16px",
              fontWeight: 600,
              color: "#1976d2",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <LinkIcon />
            Linking Mode
          </h3>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: "18px",
              cursor: "pointer",
              color: "#666",
              padding: "4px",
            }}
            title="Exit linking mode"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Instructions */}
        <div
          style={{
            backgroundColor: "#f0f7ff",
            border: "1px solid #b8daff",
            borderRadius: "6px",
            padding: "12px",
            marginBottom: "16px",
            fontSize: "14px",
            color: "#004085",
          }}
        >
          <strong>
            Step{" "}
            {currentStep === "first"
              ? "1"
              : currentStep === "second"
              ? "2"
              : "3"}
            :
          </strong>{" "}
          {getStepInstruction()}
        </div>

        {/* Progress indicators */}
        <div
          style={{
            display: "flex",
            gap: "4px",
            marginBottom: "16px",
          }}
        >
          <div
            style={{
              flex: 1,
              height: "3px",
              backgroundColor: currentStep !== "first" ? "#4caf50" : "#e0e0e0",
              borderRadius: "2px",
            }}
          />
          <div
            style={{
              flex: 1,
              height: "3px",
              backgroundColor:
                currentStep === "confirm" ? "#4caf50" : "#e0e0e0",
              borderRadius: "2px",
            }}
          />
        </div>

        {/* Selections display */}
        {firstSelection && (
          <div
            style={{
              backgroundColor: "#e8f5e8",
              border: "1px solid #4caf50",
              borderRadius: "4px",
              padding: "8px",
              marginBottom: "8px",
              fontSize: "12px",
            }}
          >
            <div style={{ fontWeight: 500, marginBottom: "4px" }}>
              ✓ First: {getDocumentTitle(firstSelection.documentId)}
              {firstSelection.elements.length > 1 && (
                <span
                  style={{ color: "#666", fontSize: "11px", marginLeft: "4px" }}
                >
                  ({firstSelection.elements.length} elements)
                </span>
              )}
            </div>
            <div style={{ color: "#666", fontStyle: "italic" }}>
              "{getSelectionPreview(firstSelection)}"
            </div>
          </div>
        )}

        {secondSelection && (
          <div
            style={{
              backgroundColor: "#e8f5e8",
              border: "1px solid #4caf50",
              borderRadius: "4px",
              padding: "8px",
              marginBottom: "8px",
              fontSize: "12px",
            }}
          >
            <div style={{ fontWeight: 500, marginBottom: "4px" }}>
              ✓ Second: {getDocumentTitle(secondSelection.documentId)}
              {secondSelection.elements.length > 1 && (
                <span
                  style={{ color: "#666", fontSize: "11px", marginLeft: "4px" }}
                >
                  ({secondSelection.elements.length} elements)
                </span>
              )}
            </div>
            <div style={{ color: "#666", fontStyle: "italic" }}>
              "{getSelectionPreview(secondSelection)}"
            </div>
          </div>
        )}

        {/* Same document warning */}
        {currentStep === "second" && (
          <div
            style={{
              backgroundColor: "#fff3cd",
              border: "1px solid #ffeaa7",
              borderRadius: "4px",
              padding: "8px",
              marginBottom: "12px",
              fontSize: "12px",
              color: "#856404",
            }}
          >
            Select text from the other document to create a link
          </div>
        )}

        {/* Description input for confirmation step */}
        {currentStep === "confirm" && (
          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "6px",
                fontSize: "12px",
                fontWeight: 500,
              }}
            >
              Description (optional):
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe this relationship..."
              style={{
                width: "100%",
                minHeight: "60px",
                padding: "6px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "12px",
                fontFamily: "inherit",
                resize: "vertical",
                boxSizing: "border-box",
              }}
            />
          </div>
        )}

        {/* Action buttons */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            flexDirection: "column",
          }}
        >
          {currentStep === "confirm" && isAuthenticated && (
            <button
              onClick={handleSaveLink}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                padding: "10px",
                backgroundColor: "#4caf50",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: 500,
              }}
            >
              <CheckIcon sx={{ fontSize: "16px" }} />
              Save Link
            </button>
          )}

          {(firstSelection || secondSelection) && (
            <button
              onClick={handleReset}
              style={{
                padding: "8px",
                backgroundColor: "#f8f9fa",
                border: "1px solid #dee2e6",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "12px",
              }}
            >
              Reset Selections
            </button>
          )}

          {!isAuthenticated && (
            <div
              style={{
                padding: "8px",
                backgroundColor: "#fff3cd",
                border: "1px solid #ffeaa7",
                borderRadius: "4px",
                fontSize: "11px",
                color: "#856404",
                textAlign: "center",
              }}
            >
              Login required to save links
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default DocumentLinkingOverlay;
