// src/features/documentGallery/DocumentViewerContainer.tsx
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "@store/hooks";
import {
  setSelectedCollectionId as setReduxSelectedCollectionId,
  fetchDocumentsByCollection,
  fetchDocumentCollections,
  fetchAllDocuments,
  selectAllDocuments,
  selectAllDocumentCollections,
  setHoveredHighlights,
} from "@store";
import HighlightingHelpIcon from "@/features/documentView/components/highlightedContent/HighlightingHelpIcon";
import DocumentCollectionGallery from "@documentGallery/DocumentCollectionGallery";
import DocumentGallery from "@documentGallery/components/DocumentGallery";
import { DocumentComparisonContainer } from "@documentView";
import DocumentLinkingOverlay from "@/features/documentView/components/DocumentLinkingOverlay";
import RouterSwitchBoard from "@/RouterSwitchBoard";
import "./styles/DocumentViewerStyles.css";
import {
  ToggleButton,
  ToggleButtonGroup,
  Switch,
  FormControlLabel,
  Box,
  Tooltip,
} from "@mui/material";
import {
  MenuBook as ReadingIcon,
  Comment as AnnotationIcon,
} from "@mui/icons-material";

import { useLocation } from "react-router-dom";

const DocumentViewerContainer: React.FC = () => {
  return <RouterSwitchBoard />;
};

export const CollectionsView: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(fetchDocumentCollections({ includeUsers: false }));
  }, [dispatch]);

  const handleCollectionSelect = (collectionId: number) => {
    navigate(`/collections/${collectionId}`);
  };

  return (
    <DocumentCollectionGallery onCollectionSelect={handleCollectionSelect} />
  );
};

export const DocumentsView: React.FC = () => {
  const { collectionId } = useParams<{ collectionId: string }>();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    if (collectionId) {
      dispatch(setReduxSelectedCollectionId(Number(collectionId)));
      dispatch(fetchDocumentsByCollection(Number(collectionId)));
    }
  }, [collectionId, dispatch]);

  const handleDocumentSelect = (documentId: number) => {
    navigate(`/collections/${collectionId}/documents/${documentId}`);
  };

  const handleBackToCollections = () => {
    navigate("/collections");
  };

  return (
    <DocumentGallery
      collectionId={collectionId ? Number(collectionId) : null}
      onDocumentSelect={handleDocumentSelect}
      onBackToCollections={handleBackToCollections}
    />
  );
};

// Main document content view component with cross-document element loading
export const DocumentContentView: React.FC = () => {
  const { collectionId, documentId } = useParams<{
    collectionId: string;
    documentId: string;
  }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Handle annotation highlighting from hash or query parameter
  useEffect(() => {
    const getAnnotationIdFromHash = (): string | null => {
      const hash = location.hash;
      if (hash.startsWith("#annotation-")) {
        return hash.replace("#annotation-", "");
      }
      return null;
    };

    // Check both hash and query parameter for annotationId
    const hashAnnotationId = getAnnotationIdFromHash();
    const queryAnnotationId = searchParams.get('annotationId');
    const annotationId = queryAnnotationId || hashAnnotationId;

    if (documentId && annotationId) {
      // Open the annotations panel when navigating to a specific annotation
      setIsAnnotationsPanelCollapsed(false);
      
      dispatch(
        setHoveredHighlights({
          documentId: documentId as unknown as number,
          highlightIds: [annotationId],
        })
      );
    }
  }, [location.hash, searchParams, dispatch, documentId]);

  const [viewedDocuments, setViewedDocuments] = useState<
    Array<{
      id: number;
      collectionId: number;
      title: string;
    }>
  >([]);

  const [documentsByCollection, setDocumentsByCollection] = useState<{
    [collectionId: number]: Array<{ id: number; title: string }>;
  }>({});

  const [isLinkingModeActive, setIsLinkingModeActive] = useState(false);

  const [pendingScrollTarget, setPendingScrollTarget] = useState<{
    documentId: number;
    targetInfo: {
      sourceURI: string;
      start: number;
      end: number;
    };
    allTargets?: Array<{
      sourceURI: string;
      start: number;
      end: number;
      text: string;
    }>;
  } | null>(null);

  const documents = useAppSelector(selectAllDocuments);
  const documentCollections = useAppSelector(
    selectAllDocumentCollections
  ) as Array<{
    id: number;
    title: string;
    description?: string;
  }>;

  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [selectedCollectionId, setSelectedCollectionId] = useState<number>(
    Number(collectionId)
  );
  const [isManagementPanelCollapsed, setIsManagementPanelCollapsed] =
    useState(true);
  const [viewMode, setViewMode] = useState<"reading" | "annotations">(
    "annotations"
  );
  const [isAnnotationsPanelCollapsed, setIsAnnotationsPanelCollapsed] =
    useState(true);

  const handleToggleAnnotationsPanel = useCallback(() => {
    setIsAnnotationsPanelCollapsed(!isAnnotationsPanelCollapsed);
  }, [isAnnotationsPanelCollapsed]);

  const [showLinkedTextHighlights, setShowLinkedTextHighlights] =
    useState(false);

  const [comparisonDocumentId, setComparisonDocumentId] = useState<
    number | null
  >(null);

  useEffect(() => {
    if (
      selectedCollectionId &&
      selectedCollectionId !== Number(collectionId) &&
      !documentsByCollection[selectedCollectionId]
    ) {
      setIsLoadingDocuments(true);

      dispatch(fetchDocumentsByCollection(selectedCollectionId))
        .unwrap()
        .then((payload) => {
          setDocumentsByCollection((prev) => ({
            ...prev,
            [selectedCollectionId]: payload.documents.map((doc) => ({
              id: doc.id,
              title: doc.title,
            })),
          }));
          setIsLoadingDocuments(false);
        })
        .catch(() => {
          setIsLoadingDocuments(false);
        });
    }
  }, [selectedCollectionId, collectionId, documentsByCollection, dispatch]);

  useEffect(() => {
    dispatch(fetchAllDocuments());
  }, [dispatch]);

  useEffect(() => {
    dispatch(fetchDocumentCollections({ includeUsers: false }));
  }, [dispatch]);

  useEffect(() => {
    if (collectionId) {
      setIsLoadingDocuments(true);

      dispatch(fetchDocumentsByCollection(Number(collectionId)))
        .unwrap()
        .then((payload) => {
          setDocumentsByCollection((prev) => ({
            ...prev,
            [Number(collectionId)]: payload.documents.map((doc) => ({
              id: doc.id,
              title: doc.title,
            })),
          }));
          setIsLoadingDocuments(false);
        })
        .catch(() => {
          setIsLoadingDocuments(false);
        });
    }
  }, [collectionId, dispatch]);

  const getDocumentTitle = useCallback(
    (docId: number, docCollectionId: number): string => {
      const docInCache = documentsByCollection[docCollectionId]?.find(
        (d) => d.id === docId
      );
      if (docInCache) {
        return docInCache.title;
      }

      const docInRedux = documents.find((d) => d.id === docId);
      if (docInRedux) {
        return docInRedux.title;
      }

      return `Document ${docId}`;
    },
    [documentsByCollection, documents]
  );

  useEffect(() => {
    if (documentId && collectionId) {
      const docId = Number(documentId);
      const colId = Number(collectionId);

      let initialTitle = `Document ${docId}`;

      const docInCache = documentsByCollection[colId]?.find(
        (d) => d.id === docId
      );
      if (docInCache) {
        initialTitle = docInCache.title;
      } else {
        const docInRedux = documents.find((d) => d.id === docId);
        if (docInRedux) {
          initialTitle = docInRedux.title;
        }
      }

      setViewedDocuments([
        {
          id: docId,
          collectionId: colId,
          title: initialTitle,
        },
      ]);

      setComparisonDocumentId(null);
    }
  }, [documentId, collectionId, documentsByCollection, documents]);

  useEffect(() => {
    if (viewedDocuments.length === 2) {
      const comparisonDoc = viewedDocuments[1];
      setComparisonDocumentId(comparisonDoc.id);
    } else if (viewedDocuments.length === 1) {
      setComparisonDocumentId(null);
    }
  }, [viewedDocuments]);

  useEffect(() => {
    if (
      pendingScrollTarget &&
      viewedDocuments.some((doc) => doc.id === pendingScrollTarget.documentId)
    ) {
      const scrollTimeout = setTimeout(() => {
        try {
          const documentPanel = document.querySelector(
            `[data-document-id="${pendingScrollTarget.documentId}"]`
          );
          if (documentPanel) {
            // Just scroll, don't highlight - Redux will handle highlighting
            const element = document.getElementById(
              pendingScrollTarget.targetInfo.sourceURI.replace("/", "")
            );
            if (element) {
              element.scrollIntoView({
                behavior: "smooth",
                block: "center",
              });
            }
            setPendingScrollTarget(null);
          } else {
            setTimeout(() => {
              const element = document.getElementById(
                pendingScrollTarget.targetInfo.sourceURI.replace("/", "")
              );
              if (element) {
                element.scrollIntoView({
                  behavior: "smooth",
                  block: "center",
                });
              }
              setPendingScrollTarget(null);
            }, 2000);
          }
        } catch (error) {
          setPendingScrollTarget(null);
          console.error("Error during scroll:", error);
        }
      }, 1500);

      return () => clearTimeout(scrollTimeout);
    }
  }, [pendingScrollTarget, viewedDocuments]);

  const handleComparisonDocumentChange = useCallback(
    async (newComparisonDocumentId: number | null) => {
      if (newComparisonDocumentId === null) {
        setViewedDocuments((prev) => prev.slice(0, 1));
        setComparisonDocumentId(null);
      } else {
        const primaryDocument = viewedDocuments[0];
        const comparisonDocTitle = getDocumentTitle(
          newComparisonDocumentId,
          selectedCollectionId
        );

        setViewedDocuments([
          primaryDocument,
          {
            id: newComparisonDocumentId,
            collectionId: selectedCollectionId,
            title: comparisonDocTitle,
          },
        ]);

        setComparisonDocumentId(newComparisonDocumentId);
      }
    },
    [viewedDocuments, selectedCollectionId, getDocumentTitle]
  );

  const handleAddComparisonDocument = useCallback(
    (docId: number) => {
      handleComparisonDocumentChange(docId);
    },
    [handleComparisonDocumentChange]
  );

  const handleRemoveDocument = useCallback(
    (docId: number) => {
      setViewedDocuments((prev) => prev.filter((doc) => doc.id !== docId));

      if (pendingScrollTarget && pendingScrollTarget.documentId === docId) {
        setPendingScrollTarget(null);
      }

      if (docId === comparisonDocumentId) {
        setComparisonDocumentId(null);
      }

      if (docId === Number(documentId)) {
        navigate(`/collections/${collectionId}`);
      }
    },
    [
      pendingScrollTarget,
      comparisonDocumentId,
      documentId,
      collectionId,
      navigate,
    ]
  );

  const handleBackToDocuments = useCallback(() => {
    navigate(`/collections/${collectionId}`);
  }, [navigate, collectionId]);

  const handleCollectionChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newCollectionId = Number(e.target.value);
      setSelectedCollectionId(newCollectionId);
    },
    []
  );

  const toggleManagementPanel = useCallback(() => {
    setIsManagementPanelCollapsed(!isManagementPanelCollapsed);
  }, [isManagementPanelCollapsed]);

  const handleViewModeChange = useCallback(
    (mode: "reading" | "annotations") => {
      setViewMode(mode);
    },
    []
  );

  const availableInSelectedCollection = (
    documentsByCollection[selectedCollectionId] || []
  ).filter(
    (doc) => !viewedDocuments.some((viewedDoc) => viewedDoc.id === doc.id)
  );

  return (
    <div className="document-content-view">
      <div className="document-view-header">
        <div className="header-row">
          <button onClick={handleBackToDocuments} className="back-button">
            ← Back to Documents
          </button>

          <div className="view-controls">
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: { xs: 1, sm: 2 },
                backgroundColor: "background.paper",
                padding: { xs: 1, sm: 1.5 },
                borderRadius: 2,
                boxShadow: 1,
                width: "fit-content",
                minWidth: 0,
              }}
            >
              <ToggleButtonGroup
                value={viewMode}
                exclusive
                onChange={(_event, newMode) => {
                  if (newMode !== null) {
                    handleViewModeChange(newMode);
                  }
                }}
                size="small"
                sx={{
                  "& .MuiToggleButton-root": {
                    px: { xs: 1, sm: 2 },
                    py: { xs: 0.5, sm: 1 },
                    fontWeight: 500,
                    textTransform: "none",
                    fontSize: { xs: "0.75rem", sm: "0.875rem" },
                    border: "1px solid",
                    borderColor: "divider",
                    "&.Mui-selected": {
                      backgroundColor: "primary.main",
                      color: "primary.contrastText",
                      "&:hover": {
                        backgroundColor: "primary.dark",
                      },
                    },
                    "&:hover": {
                      backgroundColor: "action.hover",
                    },
                    "& .MuiSvgIcon-root": {
                      fontSize: { xs: 16, sm: 18 },
                      mr: { xs: 0, sm: 1 },
                    },
                    "& span:not(.MuiSvgIcon-root)": {
                      display: { xs: "none", sm: "inline" },
                    },
                  },
                }}
              >
                <ToggleButton value="reading" aria-label="reading mode">
                  <ReadingIcon />
                  <span>Reading</span>
                </ToggleButton>
                <ToggleButton value="annotations" aria-label="annotations mode">
                  <AnnotationIcon />
                  <span>Annotations</span>
                </ToggleButton>
              </ToggleButtonGroup>

              <Tooltip title="Highlight linked text between documents">
                <FormControlLabel
                  control={
                    <Switch
                      checked={showLinkedTextHighlights}
                      onChange={(event) =>
                        setShowLinkedTextHighlights(event.target.checked)
                      }
                      color="primary"
                      size="small"
                    />
                  }
                  label={
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 0.5,
                        "& > span:first-of-type": {
                          display: { xs: "none", sm: "inline" },
                        },
                      }}
                    >
                      <span>Show Links</span>
                    </Box>
                  }
                  sx={{
                    margin: 0,
                    "& .MuiFormControlLabel-label": {
                      fontSize: { xs: "0.75rem", sm: "0.875rem" },
                      fontWeight: 500,
                    },
                  }}
                />
              </Tooltip>
            </Box>
          </div>

          <div
            className={`document-comparison-panel ${
              isManagementPanelCollapsed ? "collapsed" : ""
            }`}
          >
            <div className="panel-header" onClick={toggleManagementPanel}>
              <h3>Document Comparison</h3>
              <button className="collapse-toggle" aria-label="Toggle panel">
                {isManagementPanelCollapsed ? "▼" : "▲"}
              </button>
            </div>
          </div>

          <div className="help-icon-container">
            <HighlightingHelpIcon />
          </div>
        </div>

        {!isManagementPanelCollapsed && (
          <div className="panel-content">
            {viewedDocuments.length === 2 && (
              <div className="document-linking-controls">
                <button
                  onClick={() => setIsLinkingModeActive(true)}
                  className="link-documents-btn"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    width: "100%",
                    padding: "8px 12px",
                    backgroundColor: isLinkingModeActive
                      ? "#1976d2"
                      : "#e3f2fd",
                    border: "1px solid #1976d2",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: isLinkingModeActive ? "white" : "#1976d2",
                    marginBottom: "12px",
                  }}
                >
                  <span className="icon">🔗</span>
                  {isLinkingModeActive
                    ? "Linking Mode Active"
                    : "Link Documents"}
                </button>

                <div
                  style={{
                    fontSize: "12px",
                    color: "#666",
                    fontStyle: "italic",
                    padding: "8px",
                    backgroundColor: "#f8f9fa",
                    borderRadius: "4px",
                    marginBottom: "12px",
                  }}
                >
                  💡 Right-click on linked text to navigate between documents
                </div>
              </div>
            )}

            <div className="viewed-documents">
              <h4>Currently Viewing:</h4>
              <ul className="document-list">
                {viewedDocuments.map((doc, index) => (
                  <li key={doc.id} className="document-item">
                    <span className="document-indicator">
                      {index === 0 ? "📄" : "📋"}
                    </span>
                    <span className="document-title">{doc.title}</span>
                    {index === 0 && (
                      <span
                        style={{
                          fontSize: "11px",
                          color: "#666",
                          marginLeft: "6px",
                        }}
                      >
                        (primary)
                      </span>
                    )}
                    <button
                      onClick={() => handleRemoveDocument(doc.id)}
                      className="remove-document-btn"
                      aria-label="Remove document"
                      disabled={index === 0 && viewedDocuments.length === 1}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {viewedDocuments.length < 2 && (
              <div className="add-document-controls">
                <h4>Add Document for Comparison:</h4>

                <div className="collection-selector">
                  <label htmlFor="collection-select">Collection:</label>
                  <select
                    id="collection-select"
                    value={selectedCollectionId}
                    onChange={handleCollectionChange}
                    className="collection-select"
                  >
                    {documentCollections.map((collection) => (
                      <option key={collection.id} value={collection.id}>
                        {collection.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="document-selector">
                  <label htmlFor="document-select">Document:</label>
                  <select
                    id="document-select"
                    onChange={(e) => {
                      const selectedId = Number(e.target.value);
                      if (selectedId) {
                        handleAddComparisonDocument(selectedId);
                      }
                    }}
                    value={comparisonDocumentId || ""}
                    className="document-select"
                    disabled={
                      isLoadingDocuments ||
                      availableInSelectedCollection.length === 0
                    }
                  >
                    {isLoadingDocuments ? (
                      <option value="">Loading...</option>
                    ) : (
                      <>
                        <option value="">
                          {availableInSelectedCollection.length === 0
                            ? "No other documents available"
                            : "Select a document"}
                        </option>
                        {availableInSelectedCollection.map((doc) => (
                          <option key={doc.id} value={doc.id}>
                            {doc.title || `Document ${doc.id}`}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                </div>
              </div>
            )}
          </div>
        )}

        {isLoadingDocuments && (
          <div
            style={{
              position: "fixed",
              top: "70px",
              right: "20px",
              zIndex: 1000,
              backgroundColor: "#1976d2",
              color: "white",
              padding: "8px 16px",
              borderRadius: "4px",
              fontSize: "14px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
            }}
          >
            Loading document...
          </div>
        )}
      </div>

      {viewedDocuments.length > 0 ? (
        <DocumentComparisonContainer
          documents={viewedDocuments}
          viewMode={viewMode}
          handleViewModeChange={handleViewModeChange}
          isLinkingModeActive={isLinkingModeActive}
          showLinkedTextHighlights={showLinkedTextHighlights}
          isAnnotationsPanelCollapsed={isAnnotationsPanelCollapsed}
          onToggleAnnotationsPanel={handleToggleAnnotationsPanel}
          flaggedAnnotationId={searchParams.get('annotationId')}
        />
      ) : (
        <div className="no-documents-message">
          No documents selected for viewing
        </div>
      )}

      {isLinkingModeActive && (
        <DocumentLinkingOverlay
          documents={viewedDocuments}
          onClose={() => setIsLinkingModeActive(false)}
        />
      )}
    </div>
  );
};

export default DocumentViewerContainer;
