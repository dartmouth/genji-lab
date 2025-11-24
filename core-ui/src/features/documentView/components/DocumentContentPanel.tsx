// src/features/documentView/components/DocumentContentPanel.tsx
import React, { useEffect } from "react";
import { HighlightedText, MenuContext } from ".";
import {
  RootState,
  fetchDocumentElements,
  selectElementsByDocumentId,
  selectDocumentStatusById,
  selectDocumentErrorById,
} from "@store";
import { useSelector } from "react-redux";
import { useAppDispatch } from "@store/hooks";
import {
  selectNavigationHighlights,
  clearAllNavigationHighlights,
} from "@store/slice/navigationHighlightSlice";
import { scrollToAndHighlightText } from "@documentView/utils/scrollToTextUtils";
import "../styles/DocumentContentStyles.css";
import { DocumentElement } from "@documentView/types";
// import { ExternalReferencesSection } from "./externalReferences";
// import { selectExternalReferencesByParagraph } from "@store/selector/combinedSelectors";

interface DocumentContentPanelProps {
  documentId: number;
  documentCollectionId: number;
  viewMode?: "reading" | "annotations";
  viewedDocuments?: Array<{
    id: number;
    collectionId: number;
    title: string;
  }>;
  isLinkingModeActive?: boolean;
  showLinkedTextHighlights?: boolean;
  flaggedAnnotationId?: string | null;
}

const DocumentContentPanel: React.FC<DocumentContentPanelProps> = ({
  documentId,
  documentCollectionId,
  viewedDocuments = [],
  viewMode = "annotations",
  isLinkingModeActive = false,
  showLinkedTextHighlights = false,
  flaggedAnnotationId = null,
}) => {
  // Use memoized selectors to prevent unnecessary re-renders
  const dispatch = useAppDispatch();

  const documentElements = useSelector((state: RootState) =>
    selectElementsByDocumentId(state, documentId)
  ) as DocumentElement[];

  const documentStatus = useSelector((state: RootState) =>
    selectDocumentStatusById(state, documentId)
  );

  const documentError = useSelector((state: RootState) =>
    selectDocumentErrorById(state, documentId)
  );

  const navigationHighlights = useSelector(selectNavigationHighlights);

  // Enhanced element loading for cross-document navigation
  useEffect(() => {
    if (documentId) {
      // Always fetch elements when document changes, even if some exist
      dispatch(fetchDocumentElements(documentId))
        .unwrap()
        .catch((error) => {
          console.error(
            "Failed to fetch elements for document",
            documentId,
            ":",
            error
          );
        });
    }
  }, [dispatch, documentId]);

  // Force element loading for all viewed documents when viewedDocuments changes
  useEffect(() => {
    viewedDocuments.forEach((doc) => {
      // Always fetch elements for each viewed document to ensure cross-document linking works
      dispatch(fetchDocumentElements(doc.id))
        .unwrap()
        .catch((error) => {
          console.error(
            `Failed to load elements for viewed document ${doc.id}:`,
            error
          );
        });
    });
  }, [viewedDocuments, dispatch]);

  // Handle navigation highlights when document loads
  useEffect(() => {
    // Check if there are navigation highlights and if elements are loaded
    if (
      Object.keys(navigationHighlights).length > 0 &&
      documentElements.length > 0 &&
      documentStatus === "succeeded"
    ) {
      // Wait for DOM to be fully ready
      const timer = setTimeout(() => {
        // Convert navigation highlights to target format
        const targets = Object.keys(navigationHighlights).map((elementURI) => ({
          sourceURI: elementURI,
          start: 0, // We don't have start/end in navigation highlights, so highlight whole element
          end: 0,
          text: "",
        }));

        if (targets.length > 0) {
          // Scroll to and highlight the first target
          scrollToAndHighlightText(
            targets[0],
            targets,
            false // Don't highlight source immediately since we're coming from link view
          ).then(() => {
            // Clear navigation highlights after showing them
            setTimeout(() => {
              dispatch(clearAllNavigationHighlights());
            }, 3000); // Clear after 3 seconds (after animation completes)
          });
        }
      }, 500); // Wait 500ms for DOM to stabilize

      return () => clearTimeout(timer);
    }
  }, [navigationHighlights, documentElements, documentStatus, dispatch]);

  // Loading/Error states
  if (documentStatus === "loading" && documentElements.length === 0) {
    return (
      <div className="loading-indicator">Loading document elements...</div>
    );
  }

  if (documentStatus === "failed") {
    return (
      <div className="error-message">
        <strong>Error loading document:</strong>
        <br />
        {documentError}
        <button
          onClick={() => dispatch(fetchDocumentElements(documentId))}
          className="retry-button"
          style={{ marginTop: "8px" }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="document-panel">
      <div className="document-content-container">
        {/* Add data attributes for better element identification */}
        {documentElements.map((content) => {
          const paragraphId = `DocumentElements/${content.id}`;
          return (
            <div key={content.id} className="document-element-wrapper">
              <div
                className="document-content"
                id={paragraphId}
                data-element-id={content.id}
                data-document-id={documentId}
                data-source-uri={`/DocumentElements/${content.id}`}
              >
                <HighlightedText
                  text={content.content.text}
                  paragraphId={paragraphId}
                  format={content.content.formatting}
                  documentCollectionId={documentCollectionId}
                  documentId={documentId}
                  isLinkingModeActive={isLinkingModeActive}
                  viewMode={viewMode}
                  showLinkedTextHighlights={showLinkedTextHighlights}
                  viewedDocuments={viewedDocuments}
                  flaggedAnnotationId={flaggedAnnotationId}
                />
              </div>

              {/* <ExternalReferencesDisplay paragraphId={paragraphId} /> */}
            </div>
          );
        })}

        {/* MenuContext now handles navigation internally via react-router */}
        <MenuContext viewedDocuments={viewedDocuments} />
      </div>
    </div>
  );
};

export default DocumentContentPanel;
