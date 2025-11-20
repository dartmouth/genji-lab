// src/features/documentGallery/DocumentViewerContainer.tsx
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
  Chip,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider,
  Button,
} from "@mui/material";
import {
  MenuBook as ReadingIcon,
  Comment as AnnotationIcon,
  Close as CloseIcon,
  Add as AddIcon,
  Link as LinkIcon,
  CompareArrows as CompareIcon,
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

  useEffect(() => {
    const getAnnotationIdFromHash = (): string | null => {
      const hash = location.hash;
      if (hash.startsWith("#annotation-")) {
        return hash.replace("#annotation-", "");
      }
      return null;
    };

    const hash = getAnnotationIdFromHash();
    if (documentId && hash) {
      dispatch(
        setHoveredHighlights({
          documentId: documentId as unknown as number,
          highlightIds: [hash],
        })
      );
    }
  }, [location.hash, dispatch, documentId]);

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

  // State for showing document selector
  const [showDocumentSelector, setShowDocumentSelector] = useState(false);

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
      console.log(
        "handleComparisonDocumentChange called with:",
        newComparisonDocumentId
      );
      console.log("Current viewedDocuments:", viewedDocuments);
      console.log("Selected collection ID:", selectedCollectionId);

      if (newComparisonDocumentId === null) {
        setViewedDocuments((prev) => prev.slice(0, 1));
        setComparisonDocumentId(null);
      } else {
        const primaryDocument = viewedDocuments[0];
        const comparisonDocTitle = getDocumentTitle(
          newComparisonDocumentId,
          selectedCollectionId
        );

        const newDocumentsList = [
          primaryDocument,
          {
            id: newComparisonDocumentId,
            collectionId: selectedCollectionId,
            title: comparisonDocTitle,
          },
        ];

        console.log("Setting viewedDocuments to:", newDocumentsList);

        // Add document to viewed documents
        setViewedDocuments(newDocumentsList);
        setComparisonDocumentId(newComparisonDocumentId);
        setShowDocumentSelector(false);
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

  const handleCollectionChange = useCallback((newCollectionId: number) => {
    setSelectedCollectionId(newCollectionId);
  }, []);

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
      {/* New Streamlined Header */}
      <Box
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 1100,
          backgroundColor: "background.paper",
          borderBottom: "1px solid",
          borderColor: "divider",
          boxShadow: 1,
        }}
      >
        {/* Main Toolbar Row */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            padding: 2,
            flexWrap: "wrap",
          }}
        >
          {/* Back Button */}
          <Button
            onClick={handleBackToDocuments}
            startIcon={<span>←</span>}
            variant="outlined"
            size="small"
            sx={{ flexShrink: 0 }}
          >
            Back to Documents
          </Button>

          <Divider orientation="vertical" flexItem />

          {/* View Mode Toggles */}
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_event, newMode) => {
              if (newMode !== null) {
                handleViewModeChange(newMode);
              }
            }}
            size="small"
            sx={{ flexShrink: 0 }}
          >
            <ToggleButton value="reading">
              <ReadingIcon sx={{ mr: 1 }} />
              Reading
            </ToggleButton>
            <ToggleButton value="annotations">
              <AnnotationIcon sx={{ mr: 1 }} />
              Annotations
            </ToggleButton>
          </ToggleButtonGroup>

          {/* Show Links Toggle */}
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
              label="Show Cross References"
              sx={{ margin: 0, flexShrink: 0 }}
            />
          </Tooltip>

          <Divider orientation="vertical" flexItem />

          {/* Document Chips - Always Visible */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              flex: 1,
              minWidth: 0,
            }}
          >
            <Tooltip title="Documents currently open for viewing">
              <CompareIcon sx={{ color: "text.secondary", flexShrink: 0 }} />
            </Tooltip>

            {viewedDocuments.map((doc, index) => (
              <Chip
                key={doc.id}
                label={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <span>{doc.title}</span>
                    {index === 0 && (
                      <span style={{ fontSize: "10px", opacity: 0.7 }}>
                        (primary)
                      </span>
                    )}
                  </Box>
                }
                onDelete={
                  index === 0 && viewedDocuments.length === 1
                    ? undefined
                    : () => handleRemoveDocument(doc.id)
                }
                deleteIcon={<CloseIcon />}
                color={index === 0 ? "primary" : "default"}
                variant={index === 0 ? "filled" : "outlined"}
                sx={{
                  maxWidth: "250px",
                  "& .MuiChip-label": {
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  },
                }}
              />
            ))}

            {/* Add Document Button */}
            {viewedDocuments.length < 2 && (
              <Tooltip title="Add a document for side-by-side comparison">
                <IconButton
                  size="small"
                  onClick={() => setShowDocumentSelector(!showDocumentSelector)}
                  color={showDocumentSelector ? "primary" : "default"}
                  sx={{
                    border: "1px dashed",
                    borderColor: "divider",
                    flexShrink: 0,
                  }}
                >
                  <AddIcon />
                </IconButton>
              </Tooltip>
            )}

            {/* Link Documents Button - Only when 2 docs */}
            {viewedDocuments.length === 2 && (
              <Tooltip title="Create links between passages in these documents">
                <Button
                  onClick={() => setIsLinkingModeActive(true)}
                  variant={isLinkingModeActive ? "contained" : "outlined"}
                  size="small"
                  startIcon={<LinkIcon />}
                  sx={{ flexShrink: 0 }}
                >
                  {isLinkingModeActive
                    ? "Linking Active"
                    : "Create Intertext Link"}
                </Button>
              </Tooltip>
            )}
          </Box>

          {/* Help Icon */}
          <Tooltip title="Learn about document comparison and annotation features">
            <Box sx={{ flexShrink: 0 }}>
              <HighlightingHelpIcon />
            </Box>
          </Tooltip>
        </Box>

        {/* Document Selector Dropdown - Conditional */}
        {showDocumentSelector && viewedDocuments.length < 2 && (
          <Box
            sx={{
              padding: 2,
              paddingTop: 0,
              borderTop: "1px solid",
              borderColor: "divider",
              backgroundColor: "grey.50",
              display: "flex",
              gap: 2,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Collection</InputLabel>
              <Select
                value={selectedCollectionId}
                onChange={(e) => handleCollectionChange(Number(e.target.value))}
                label="Collection"
              >
                {documentCollections.map((collection) => (
                  <MenuItem key={collection.id} value={collection.id}>
                    {collection.title}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl
              size="small"
              sx={{ minWidth: 300, flex: 1 }}
              disabled={
                isLoadingDocuments || availableInSelectedCollection.length === 0
              }
            >
              <InputLabel>Document</InputLabel>
              <Select
                value={comparisonDocumentId || ""}
                onChange={(e) => {
                  const selectedId = Number(e.target.value);
                  if (selectedId) {
                    handleAddComparisonDocument(selectedId);
                  }
                }}
                label="Document"
              >
                {isLoadingDocuments ? (
                  <MenuItem value="">Loading...</MenuItem>
                ) : (
                  [
                    <MenuItem key="placeholder" value="">
                      {availableInSelectedCollection.length === 0
                        ? "No other documents available"
                        : "Select a document"}
                    </MenuItem>,
                    ...availableInSelectedCollection.map((doc) => (
                      <MenuItem key={doc.id} value={doc.id}>
                        {doc.title || `Document ${doc.id}`}
                      </MenuItem>
                    )),
                  ]
                )}
              </Select>
            </FormControl>

            <Button
              size="small"
              onClick={() => setShowDocumentSelector(false)}
              variant="text"
            >
              Cancel
            </Button>
          </Box>
        )}

        {/* Linking Mode Hint */}
        {isLinkingModeActive && (
          <Box
            sx={{
              padding: 1.5,
              backgroundColor: "info.light",
              color: "info.contrastText",
              display: "flex",
              alignItems: "center",
              gap: 1,
              fontSize: "0.875rem",
            }}
          >
            <LinkIcon fontSize="small" />
            <span>
              💡 <strong>Linking Mode Active:</strong> Select text in one
              document, then select text in the other document to create a link.
              Right-click linked text to navigate.
            </span>
            <Button
              size="small"
              onClick={() => setIsLinkingModeActive(false)}
              sx={{ marginLeft: "auto", color: "inherit" }}
            >
              Exit Linking Mode
            </Button>
          </Box>
        )}
      </Box>

      {/* Loading Indicator */}
      {isLoadingDocuments && (
        <Box
          sx={{
            position: "fixed",
            top: "80px",
            right: "20px",
            zIndex: 1000,
            backgroundColor: "primary.main",
            color: "primary.contrastText",
            padding: "8px 16px",
            borderRadius: 1,
            fontSize: "0.875rem",
            boxShadow: 2,
          }}
        >
          Loading document...
        </Box>
      )}

      {/* Document Content */}
      {viewedDocuments.length > 0 ? (
        <DocumentComparisonContainer
          documents={viewedDocuments}
          viewMode={viewMode}
          handleViewModeChange={handleViewModeChange}
          isLinkingModeActive={isLinkingModeActive}
          showLinkedTextHighlights={showLinkedTextHighlights}
          isAnnotationsPanelCollapsed={isAnnotationsPanelCollapsed}
          onToggleAnnotationsPanel={handleToggleAnnotationsPanel}
        />
      ) : (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "calc(100vh - 150px)",
            color: "text.secondary",
          }}
        >
          No documents selected for viewing
        </Box>
      )}

      {/* Linking Overlay */}
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
