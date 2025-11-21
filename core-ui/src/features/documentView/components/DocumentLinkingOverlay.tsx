// src/features/documentView/components/annotationCard/DocumentLinkingOverlay.tsx
import React, { useState, useEffect, useRef } from "react";
import { useAppDispatch } from "@store/hooks";
import { useAuth } from "@hooks/useAuthContext";
import { linkingAnnotations } from "@store";
import { makeTextAnnotationBody } from "@documentView/utils";
import useLocalStorage from "@/hooks/useLocalStorage";

import {
  Link as LinkIcon,
  Close as CloseIcon,
  Check as CheckIcon,
  Add as AddIcon,
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [activeClassroomValue, _setActiveClassroomValue] =
    useLocalStorage("active_classroom");

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isOptedOut, _setIsOptedOut] = useLocalStorage("classroom_opted_out");
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
      return null;
    }

    // Validate that we got a valid numeric ID
    if (!numericId || isNaN(parseInt(numericId))) {
      return null;
    }
    return numericId;
  };

  const analyzeMultiElementSelection = (
    range: Range
  ): MultiElementSelection | null => {
    const selectedText = range.toString().trim();
    if (selectedText.length === 0) return null;

    // Find all document elements that intersect with the selection
    const elementSelections: ElementSelection[] = [];

    // Find all DocumentElement containers that might be involved
    const documentElements = new Set<HTMLElement>();

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

    if (documentElements.size === 0) {
      const allDocElements = document.querySelectorAll(
        '[id*="DocumentElements"]'
      );
      const seenIds = new Set<string>();

      allDocElements.forEach((element) => {
        try {
          if (range.intersectsNode(element)) {
            const elementId = (element as HTMLElement).id;
            if (!seenIds.has(elementId)) {
              seenIds.add(elementId);
              documentElements.add(element as HTMLElement);
            }
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
      return null;
    }

    documentElements.forEach((element) => {
      const elementId = element.id;
      const numericId = extractNumericId(elementId);
      if (!numericId) {
        console.warn("Skipping element with invalid ID:", elementId);
        return;
      }

      const elementText = element.textContent || "";

      if (elementText.length === 0) {
        return;
      }

      let intersectionText = "";
      let elementStart = -1;
      let elementEnd = -1;

      try {
        const elementRange = window.document.createRange();
        elementRange.selectNodeContents(element);

        if (!range.intersectsNode(element)) {
          return;
        }

        const intersectionRange = window.document.createRange();

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

        if (range.compareBoundaryPoints(Range.END_TO_END, elementRange) <= 0) {
          intersectionRange.setEnd(range.endContainer, range.endOffset);
        } else {
          intersectionRange.setEnd(
            elementRange.endContainer,
            elementRange.endOffset
          );
        }

        intersectionText = intersectionRange.toString().trim();

        if (intersectionText.length > 0) {
          elementStart = elementText.indexOf(intersectionText);
          if (elementStart !== -1) {
            elementEnd = elementStart + intersectionText.length;
          } else {
            const searchTexts = [
              intersectionText.trim(),
              intersectionText.length > 50
                ? intersectionText.substring(0, 50)
                : intersectionText,
              intersectionText.length > 20
                ? intersectionText.substring(0, 20)
                : intersectionText,
              intersectionText.length > 50
                ? intersectionText.substring(intersectionText.length - 50)
                : null,
            ].filter((text) => text && text.length > 0);

            for (const searchText of searchTexts) {
              if (!searchText) continue;

              elementStart = elementText.indexOf(searchText);
              if (elementStart !== -1) {
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
                break;
              }
            }

            if (elementStart === -1 && intersectionText.length > 10) {
              for (let i = 0; i < intersectionText.length - 10; i += 5) {
                const substring = intersectionText.substring(i, i + 10);
                const foundIndex = elementText.indexOf(substring);
                if (foundIndex !== -1) {
                  elementStart = foundIndex;
                  elementEnd = Math.min(
                    foundIndex + intersectionText.length,
                    elementText.length
                  );
                  intersectionText = elementText.substring(
                    elementStart,
                    elementEnd
                  );
                  break;
                }
              }
            }
          }
        }
      } catch (error) {
        console.error(
          error,
          "Error calculating intersection for element:",
          elementId
        );

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
        elementSelections.push({
          documentElementId: parseInt(numericId),
          sourceURI: `DocumentElements/${numericId}`,
          text: intersectionText,
          start: elementStart,
          end: elementEnd,
        });
      } else {
        return;
      }
    });

    if (elementSelections.length === 0) {
      return null;
    }

    const firstElement = Array.from(documentElements)[0];
    if (!firstElement) return null;

    const documentPanel = firstElement.closest(
      ".document-panel-wrapper"
    ) as HTMLElement;
    if (!documentPanel) {
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

    return {
      documentId: foundDocument.id,
      elements: elementSelections,
      fullText: selectedText,
    };
  };

  // Listen for text selections
  useEffect(() => {
    const handleSelection = (e: MouseEvent) => {
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

      if (selectedText === lastProcessedText.current) {
        return;
      }
      lastProcessedText.current = selectedText;

      const multiElementSelection = analyzeMultiElementSelection(range);

      if (!multiElementSelection) {
        return;
      }

      if (currentStep === "first") {
        setFirstSelection(multiElementSelection);
        setCurrentStep("second");
      } else if (currentStep === "second") {
        // REMOVED: Check preventing same-document linking
        // Now allows linking within the same document
        setSecondSelection(multiElementSelection);
        setCurrentStep("confirm");
      }

      selection.removeAllRanges();

      setTimeout(() => {
        lastProcessedText.current = "";
      }, 500);
    };

    const handleMouseDown = (e: MouseEvent) => {
      e.stopPropagation();
      e.stopImmediatePropagation();
    };

    document.addEventListener("mousedown", handleMouseDown, true);
    document.addEventListener("mouseup", handleSelection, true);

    return () => {
      document.removeEventListener("mousedown", handleMouseDown, true);
      document.removeEventListener("mouseup", handleSelection, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, firstSelection, documents]);

  const handleSaveLink = () => {
    if (!user || !isAuthenticated || !firstSelection) {
      return;
    }

    // Support saving with just one selection or two selections
    const segments = secondSelection
      ? [
          // First selection segments
          firstSelection.elements.map((element) => ({
            sourceURI: element.sourceURI,
            start: element.start,
            end: element.end,
            text: element.text,
          })),
          // Second selection segments
          secondSelection.elements.map((element) => ({
            sourceURI: element.sourceURI,
            start: element.start,
            end: element.end,
            text: element.text,
          })),
        ]
      : [
          // Only first selection
          firstSelection.elements.map((element) => ({
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
    const classroomId =
      activeClassroomValue && !isOptedOut ? activeClassroomValue : undefined;

    dispatch(
      linkingAnnotations.thunks.saveAnnotation({
        annotation: annoBody,
        classroomId: classroomId,
      })
    );
    onClose();
  };

  const handleReset = () => {
    setFirstSelection(null);
    setSecondSelection(null);
    setCurrentStep("first");
    setDescription("");
    lastProcessedText.current = "";
  };

  // NEW: Handle saving with just first selection
  const handleSavePartialLink = () => {
    if (!user || !isAuthenticated || !firstSelection) {
      return;
    }

    const segments = [
      firstSelection.elements.map((element) => ({
        sourceURI: element.sourceURI,
        start: element.start,
        end: element.end,
        text: element.text,
      })),
    ];

    const annoBody = makeTextAnnotationBody(
      documents[0].collectionId,
      firstSelection.documentId,
      firstSelection.elements[0].documentElementId,
      user.id,
      "linking",
      description || "Partial link (to be completed)",
      segments
    );
    const classroomId =
      activeClassroomValue && !isOptedOut ? activeClassroomValue : undefined;

    dispatch(
      linkingAnnotations.thunks.saveAnnotation({
        annotation: annoBody,
        classroomId: classroomId,
      })
    );
    onClose();
  };

  const getDocumentTitle = (docId: number) => {
    return documents.find((d) => d.id === docId)?.title || `Document ${docId}`;
  };

  const getStepInstruction = () => {
    switch (currentStep) {
      case "first":
        return "Select text to start a link";
      case "second":
        return documents.length > 1
          ? "Select corresponding text (same or different document)"
          : "Select another text snippet to link";
      case "confirm":
        return "Review your selections and save the link";
      default:
        return "";
    }
  };

  const getSelectionPreview = (selection: MultiElementSelection) => {
    return (
      selection.fullText.substring(0, 100) +
      (selection.fullText.length > 100 ? "..." : "")
    );
  };

  return (
    <>
      {/* Document highlighting overlay */}
      <div className="document-linking-overlay" />

      {/* Floating control panel */}
      <div className="document-linking-panel">
        <div className="document-linking-panel__header">
          <h3 className="document-linking-panel__title">
            <LinkIcon />
            Linking Mode
          </h3>
          <button
            onClick={onClose}
            className="document-linking-panel__close"
            title="Exit linking mode"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Instructions */}
        <div className="document-linking-panel__instructions">
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
        <div className="document-linking-panel__progress">
          <div
            className={`document-linking-panel__progress-bar ${
              currentStep !== "first"
                ? "document-linking-panel__progress-bar--active"
                : "document-linking-panel__progress-bar--inactive"
            }`}
          />
          <div
            className={`document-linking-panel__progress-bar ${
              currentStep === "confirm"
                ? "document-linking-panel__progress-bar--active"
                : "document-linking-panel__progress-bar--inactive"
            }`}
          />
        </div>

        {/* Selections display */}
        {firstSelection && (
          <div className="document-linking-panel__selection">
            <div className="document-linking-panel__selection-header">
              ✓ First: {getDocumentTitle(firstSelection.documentId)}
              {firstSelection.elements.length > 1 && (
                <span className="document-linking-panel__element-count">
                  ({firstSelection.elements.length} elements)
                </span>
              )}
            </div>
            <div className="document-linking-panel__selection-preview">
              "{getSelectionPreview(firstSelection)}"
            </div>
          </div>
        )}

        {secondSelection && (
          <div className="document-linking-panel__selection">
            <div className="document-linking-panel__selection-header">
              ✓ Second: {getDocumentTitle(secondSelection.documentId)}
              {secondSelection.elements.length > 1 && (
                <span className="document-linking-panel__element-count">
                  ({secondSelection.elements.length} elements)
                </span>
              )}
            </div>
            <div className="document-linking-panel__selection-preview">
              "{getSelectionPreview(secondSelection)}"
            </div>
          </div>
        )}

        {/* Info message for second step */}
        {currentStep === "second" && (
          <div className="document-linking-panel__info">
            💡 You can select text from{" "}
            {documents.length > 1 ? "any document" : "the same document"} or
            save this as a partial link
          </div>
        )}

        {/* Description input for confirmation step or second step (for partial saves) */}
        {(currentStep === "confirm" || currentStep === "second") && (
          <div className="document-linking-panel__description">
            <label className="document-linking-panel__description-label">
              Description (optional):
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe this relationship..."
              className="document-linking-panel__description-textarea"
            />
          </div>
        )}

        {/* Action buttons */}
        <div className="document-linking-panel__actions">
          {currentStep === "confirm" && isAuthenticated && (
            <button
              onClick={handleSaveLink}
              className="document-linking-panel__save-button"
            >
              <CheckIcon sx={{ fontSize: "16px" }} />
              Save Link
            </button>
          )}

          {/* NEW: Partial save button */}
          {currentStep === "second" && isAuthenticated && firstSelection && (
            <button
              onClick={handleSavePartialLink}
              className="document-linking-panel__save-button"
              style={{ backgroundColor: "#16A085" }}
            >
              <AddIcon sx={{ fontSize: "16px" }} />
              Save as Partial Link
            </button>
          )}

          {(firstSelection || secondSelection) && (
            <button
              onClick={handleReset}
              className="document-linking-panel__reset-button"
            >
              Reset Selections
            </button>
          )}

          {!isAuthenticated && (
            <div className="document-linking-panel__login-notice">
              Login required to save links
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default DocumentLinkingOverlay;
