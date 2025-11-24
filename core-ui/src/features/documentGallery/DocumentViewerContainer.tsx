// src/features/documentGallery/DocumentViewerContainer.tsx
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
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
import DocumentCollectionGallery from "@documentGallery/DocumentCollectionGallery";
import DocumentGallery from "@documentGallery/components/DocumentGallery";
import { DocumentComparisonContainer } from "@documentView";
import DocumentLinkingOverlay from "@/features/documentView/components/DocumentLinkingOverlay";
import DocumentComparisonToolbar from "@/features/documentView/components/documentComparisonToolbar/DocumentComparisonToolbar";
import RouterSwitchBoard from "@/RouterSwitchBoard";
import "./styles/DocumentViewerStyles.css";
import { Box } from "@mui/material";

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

  // Use effect to handle URL hash changes for highlighting
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

  // useEffect to load documents when selectedCollectionId changes
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

  // useEffect to load documents for the current collectionId from URL
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
    if (!documentId && !collectionId) {
      return;
    }
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
  }, [documentId, collectionId, documentsByCollection, documents]);

  useEffect(() => {
    switch (viewedDocuments.length) {
      case 2:
        setComparisonDocumentId(viewedDocuments[1].id);
        break;
      default:
        setComparisonDocumentId(null);
    }
  }, [viewedDocuments]);

  // useEffect to handle scrolling to pending targets
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
      // Comment to explain why we clear pending scroll target
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
  )
    .filter(
      (doc) => !viewedDocuments.some((viewedDoc) => viewedDoc.id === doc.id)
    )
    .sort((a, b) => a.id - b.id);

  console.log("View Mode DocumentViewerContainer", viewMode);

  return (
    <div className="document-content-view">
      {/* Toolbar Component */}
      <DocumentComparisonToolbar
        viewMode={viewMode}
        showLinkedTextHighlights={showLinkedTextHighlights}
        viewedDocuments={viewedDocuments}
        showDocumentSelector={showDocumentSelector}
        isLinkingModeActive={isLinkingModeActive}
        isLoadingDocuments={isLoadingDocuments}
        selectedCollectionId={selectedCollectionId}
        comparisonDocumentId={comparisonDocumentId}
        documentCollections={documentCollections}
        availableDocuments={availableInSelectedCollection}
        handleBackToDocuments={handleBackToDocuments}
        handleViewModeChange={handleViewModeChange}
        setShowLinkedTextHighlights={setShowLinkedTextHighlights}
        handleRemoveDocument={handleRemoveDocument}
        setShowDocumentSelector={setShowDocumentSelector}
        setIsLinkingModeActive={setIsLinkingModeActive}
        handleCollectionChange={handleCollectionChange}
        handleAddComparisonDocument={handleAddComparisonDocument}
      />

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
