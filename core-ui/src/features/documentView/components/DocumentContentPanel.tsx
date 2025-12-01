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
}

const DocumentContentPanel: React.FC<DocumentContentPanelProps> = ({
  documentId,
  documentCollectionId,
  viewedDocuments = [],
  viewMode = "annotations",
  isLinkingModeActive = false,
  showLinkedTextHighlights = false,
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
          
          const handleOpenInNewWindow = () => {
            window.open(`/element?element_id=${content.id}`, '_blank', 'noopener,noreferrer');
          };
          
          return (
            <div key={content.id} className="document-element-wrapper">
              <button 
                className="element-open-button"
                onClick={handleOpenInNewWindow}
                title="Open paragraph in new window"
                aria-label={`Open element ${content.id} in new window`}
              >
                ↗
              </button>
              
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
                />
              </div>
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
