// src/documentView/DocumentComparisonContainer.tsx
import React, { useState, useEffect, useMemo } from "react";
import { DocumentContentPanel } from ".";
import TabbedAnnotationsPanel from "./components/TabbedAnnotationsPanel";
import { useAppSelector } from "@store/hooks";
import { commentingAnnotations, scholarlyAnnotations } from "@store";
import "./styles/DocumentComparisonStyles.css";

// Define annotation panel position type
type AnnotationPanelPosition = "bottom" | "right" | "left";

// Document props interface with title
interface DocumentProps {
  id: number;
  collectionId: number;
  title: string;
}

interface DocumentComparisonContainerProps {
  documents: Array<DocumentProps>;
  viewMode?: "reading" | "annotations";
  handleViewModeChange?: (mode: "reading" | "annotations") => void;
  isLinkingModeActive?: boolean;
  showLinkedTextHighlights?: boolean;
  isAnnotationsPanelCollapsed?: boolean;
  onToggleAnnotationsPanel?: () => void;
  onOpenLinkedDocument?: (
    documentId: number,
    collectionId: number,
    targetInfo: {
      sourceURI: string;
      start: number;
      end: number;
    },
    allTargets?: Array<{
      sourceURI: string;
      start: number;
      end: number;
      text: string;
    }>
  ) => void;
}

const DocumentComparisonContainer: React.FC<
  DocumentComparisonContainerProps
> = ({
  documents,
  viewMode = "annotations", // Changed default to annotations
  isLinkingModeActive = false,
  showLinkedTextHighlights = false,
  isAnnotationsPanelCollapsed = true, // Default to collapsed
  onToggleAnnotationsPanel,
  onOpenLinkedDocument,
}) => {
  // State for active document (for highlight tracking)
  const [activeDocumentId, setActiveDocumentId] = useState<number | undefined>(
    documents.length > 0 ? documents[0].id : undefined
  );

  // State for annotation panel position (bottom, right, left)
  const [annotationPanelPosition, setAnnotationPanelPosition] =
    useState<AnnotationPanelPosition>("bottom");

  // Use the collapsed state from props instead of internal state
  const isPanelVisible = !isAnnotationsPanelCollapsed;

  // Determine layout based on number of documents
  const layoutClass =
    documents.length > 1 ? "multi-document-layout" : "single-document-layout";

  // Assign colors to documents
  const documentColors = useMemo(() => {
    // Define a list of distinct colors for documents
    const colors = [
      "#4285F4", // Blue
      "#34A853", // Green
      "#FBBC05", // Yellow
      "#EA4335", // Red
      "#8F44AD", // Purple
      "#16A085", // Teal
      "#F39C12", // Orange
      "#2C3E50", // Dark Blue
    ];

    return documents.reduce((acc, doc, index) => {
      acc[doc.id] = colors[index % colors.length];
      return acc;
    }, {} as Record<number, string>);
  }, [documents]);

  // Create document list for annotations panel directly from props
  const documentList = useMemo(
    () =>
      documents.map((doc) => ({
        id: doc.id,
        title: doc.title,
        color: documentColors[doc.id],
      })),
    [documents, documentColors]
  );

  // Get ALL highlight IDs for our documents
  const allHighlightIds = useAppSelector(
    (state) => {
      // Collect all highlight IDs across all documents
      const ids: string[] = [];
      documents.forEach((doc) => {
        const docHighlights = state.highlightRegistry.highlights[doc.id] || {};
        Object.values(docHighlights).forEach((docIds) => {
          ids.push(...docIds);
        });
      });
      return ids;
    },
    (prev, curr) => {
      // Check if arrays are the same length and have the same elements
      if (prev.length !== curr.length) return false;
      for (let i = 0; i < prev.length; i++) {
        if (prev[i] !== curr[i]) return false;
      }
      return true;
    }
  );

  // Get HOVERED highlight IDs from your highlightRegistry
  const hoveredHighlightIds = useAppSelector(
    (state) => {
      // Collect all hovered highlight IDs across all documents
      const ids: string[] = [];
      documents.forEach((doc) => {
        const docHoveredIds =
          state.highlightRegistry.hoveredHighlightIds[doc.id] || [];
        ids.push(...docHoveredIds);
      });
      return ids;
    },
    (prev, curr) => {
      // Check if arrays are the same length and have the same elements
      if (prev.length !== curr.length) return false;
      for (let i = 0; i < prev.length; i++) {
        if (prev[i] !== curr[i]) return false;
      }
      return true;
    }
  );

  // Get annotations for all highlights
  const makeSelectCommenting =
    commentingAnnotations.selectors.makeSelectAnnotationsById();
  const makeSelectScholarly =
    scholarlyAnnotations.selectors.makeSelectAnnotationsById();

  const allCommentingAnnotations = useAppSelector((state) =>
    makeSelectCommenting(state, allHighlightIds)
  );

  const allScholarlyAnnotations = useAppSelector((state) =>
    makeSelectScholarly(state, allHighlightIds)
  );

  // Get annotations for HOVERED highlights
  const hoveredCommentingAnnotations = useAppSelector((state) =>
    makeSelectCommenting(state, hoveredHighlightIds)
  );

  const hoveredScholarlyAnnotations = useAppSelector((state) =>
    makeSelectScholarly(state, hoveredHighlightIds)
  );

  // Filter annotations to include only those for our documents
  const documentIds = useMemo(() => documents.map((d) => d.id), [documents]);

  // All annotations for these documents
  const allAnnotations = useMemo(
    () => [
      ...allCommentingAnnotations.filter((anno) =>
        documentIds.includes(anno.document_id)
      ),
      ...allScholarlyAnnotations.filter((anno) =>
        documentIds.includes(anno.document_id)
      ),
    ],
    [allCommentingAnnotations, allScholarlyAnnotations, documentIds]
  );

  // Hovered annotations for these documents
  const hoveredAnnotations = useMemo(
    () => [
      ...hoveredCommentingAnnotations.filter((anno) =>
        documentIds.includes(anno.document_id)
      ),
      ...hoveredScholarlyAnnotations.filter((anno) =>
        documentIds.includes(anno.document_id)
      ),
    ],
    [hoveredCommentingAnnotations, hoveredScholarlyAnnotations, documentIds]
  );

  // State to track whether we're showing hovered annotations
  const [showingHoveredAnnotations, setShowingHoveredAnnotations] =
    useState(false);

  // Update the state based on whether there are hovered annotations
  // Using a simple check for length to avoid infinite render loops
  useEffect(() => {
    const hasHoveredAnnotations = hoveredAnnotations.length > 0;
    if (showingHoveredAnnotations !== hasHoveredAnnotations) {
      setShowingHoveredAnnotations(hasHoveredAnnotations);
    }
  }, [hoveredAnnotations, showingHoveredAnnotations]);

  // For sticky header shadow effect when scrolling
  useEffect(() => {
    const handleScroll = () => {
      const titleHeaders = document.querySelectorAll(".document-title-header");
      titleHeaders.forEach((header) => {
        if (header.getBoundingClientRect().top <= 0) {
          header.classList.add("scrolled");
        } else {
          header.classList.remove("scrolled");
        }
      });
    };

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // Handle document focus/hover
  const handleDocumentFocus = (docId: number) => {
    setActiveDocumentId(docId);
  };

  return (
    <div
      className={`
      document-comparison-container 
      ${layoutClass} 
      ${viewMode}-mode 
      panel-position-${annotationPanelPosition}
      ${isLinkingModeActive ? "linking-mode-active" : ""}
      ${showLinkedTextHighlights ? "show-linked-text" : ""}
    `}
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Document toolbar completely removed to prevent overlay with annotation tabs */}

      <div
        className="content-and-annotations-container"
        style={{
          flex: 1,
          position: "relative",
          height: "100%",
          overflow: "hidden",
        }}
      >
        {/* Document panels */}
        <div
          className={`documents-container ${
            viewMode === "annotations"
              ? `with-annotations-panel position-${annotationPanelPosition}`
              : ""
          }`}
          style={{
            flex: 1,
            overflow: "auto",
            paddingTop: "64px",
            ...(viewMode === "annotations" && isPanelVisible
              ? annotationPanelPosition === "bottom"
                ? {
                    paddingBottom: "40%",
                    maxHeight: "calc(100vh - 64px)",
                  }
                : annotationPanelPosition === "right"
                ? {
                    paddingRight: "30%",
                    width: "100%",
                  }
                : {
                    paddingLeft: "30%",
                    width: "100%",
                  }
              : {}),
          }}
        >
          {documents.map((doc, index) => (
            <div
              key={doc.id}
              className={`document-panel-wrapper panel-${index} ${
                doc.id === activeDocumentId ? "active" : ""
              } ${isLinkingModeActive ? "linking-mode" : ""}`}
              onMouseEnter={() => handleDocumentFocus(doc.id)}
              data-document-id={doc.id}
              style={{
                ...(isLinkingModeActive
                  ? {
                      cursor: "crosshair",
                      border: "2px dashed #1976d2",
                      borderRadius: "8px",
                      margin: "4px",
                      transition: "all 0.2s ease",
                    }
                  : {}),
              }}
            >
              {/* Document title header */}
              <div
                className="document-title-header"
                style={{
                  ...(isLinkingModeActive
                    ? {
                        backgroundColor: "rgba(25, 118, 210, 0.1)",
                        borderBottom: "1px solid #1976d2",
                      }
                    : {}),
                }}
              >
                <h2>
                  <span
                    className="color-indicator"
                    style={{ backgroundColor: documentColors[doc.id] }}
                  />
                  {doc.title}
                  {isLinkingModeActive && (
                    <span
                      style={{
                        fontSize: "12px",
                        color: "#1976d2",
                        fontWeight: "normal",
                        marginLeft: "8px",
                      }}
                    >
                      (Select text to link)
                    </span>
                  )}
                  {showLinkedTextHighlights && (
                    <span
                      style={{
                        fontSize: "12px",
                        color: "#16A085",
                        fontWeight: "normal",
                        marginLeft: "8px",
                      }}
                    >
                      (🔗 Linked text highlighted)
                    </span>
                  )}
                </h2>
              </div>

              {/* Document content panel */}
              <div className="document-content-panel">
                <DocumentContentPanel
                  documentId={doc.id}
                  documentCollectionId={doc.collectionId}
                  viewedDocuments={documents}
                  viewMode={viewMode}
                  onOpenLinkedDocument={onOpenLinkedDocument}
                  isLinkingModeActive={isLinkingModeActive}
                  showLinkedTextHighlights={showLinkedTextHighlights}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Tabbed annotations panel - only shown in annotations mode and when visible */}
        {viewMode === "annotations" &&
          documents.length > 0 &&
          isPanelVisible && (
            <div
              className={`annotations-panel-container position-${annotationPanelPosition}`}
              style={{
                ...(annotationPanelPosition === "bottom"
                  ? {
                      position: "fixed",
                      bottom: 0,
                      left: 0,
                      right: 0,
                      width: "100%",
                      height: "40%",
                      maxHeight: "400px",
                    }
                  : annotationPanelPosition === "right"
                  ? {
                      position: "fixed",
                      top: "64px",
                      right: 0,
                      bottom: 0,
                      width: "30%",
                      maxWidth: "400px",
                      height: "calc(100vh - 64px)",
                      overflowY: "auto",
                    }
                  : {
                      position: "fixed",
                      top: "64px",
                      left: 0,
                      bottom: 0,
                      width: "30%",
                      maxWidth: "400px",
                      height: "calc(100vh - 64px)",
                      overflowY: "auto",
                    }),
                zIndex: 100,
                boxShadow: "0 0 10px rgba(0,0,0,0.1)",
                backgroundColor: "#f9f9f9",
                borderTop:
                  annotationPanelPosition === "bottom"
                    ? "1px solid #ddd"
                    : "none",
                borderLeft:
                  annotationPanelPosition === "right"
                    ? "1px solid #ddd"
                    : "none",
                borderRight:
                  annotationPanelPosition === "left"
                    ? "1px solid #ddd"
                    : "none",
                opacity: 1,
                backdropFilter: "none",
                WebkitBackdropFilter: "none",
              }}
            >
              <TabbedAnnotationsPanel
                documents={documentList}
                annotations={
                  showingHoveredAnnotations
                    ? hoveredAnnotations
                    : allAnnotations
                }
                activeDocumentId={activeDocumentId}
                isHovering={showingHoveredAnnotations}
                position={annotationPanelPosition}
                onChangePosition={setAnnotationPanelPosition}
                onToggleVisibility={onToggleAnnotationsPanel}
              />
            </div>
          )}

        {/* Sticky reopen button - only shown when panel is closed */}
        {viewMode === "annotations" &&
          documents.length > 0 &&
          !isPanelVisible && (
            <div
              style={{
                position: "fixed",
                bottom: 0,
                left: 0,
                right: 0,
                display: "flex",
                justifyContent: "center",
                padding: "8px",
                backgroundColor: "#f0f2f5",
                borderTop: "1px solid #ddd",
                boxShadow: "0 -2px 5px rgba(0,0,0,0.05)",
                zIndex: 100,
              }}
            >
              <button
                onClick={onToggleAnnotationsPanel}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  border: "none",
                  borderRadius: "4px",
                  backgroundColor: "#e9ecef",
                  color: "#212529",
                  padding: "8px 16px",
                  fontSize: "14px",
                  fontWeight: 500,
                  cursor: "pointer",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                }}
              >
                <span style={{ fontSize: "16px" }}>⊕</span>
                <span>
                  Show Annotations{" "}
                  {allAnnotations.length > 0
                    ? `(${allAnnotations.length})`
                    : ""}
                </span>
              </button>
            </div>
          )}
      </div>
    </div>
  );
};

export default DocumentComparisonContainer;
