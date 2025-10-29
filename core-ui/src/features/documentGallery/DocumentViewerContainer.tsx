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
  // fetchDocumentElements,
} from "@store";
// import { scrollToAndHighlightText } from "@/features/documentView/utils/scrollToTextUtils";
// import { selectAllElementsForViewing } from "@store/selector/combinedSelectors";
import HighlightingHelpIcon from "@/features/documentView/components/highlightedContent/HighlightingHelpIcon";
// import { RootState } from "@store";
import DocumentCollectionGallery from "@documentGallery/DocumentCollectionGallery";
import DocumentGallery from "@documentGallery/components/DocumentGallery";
import { DocumentComparisonContainer } from "@documentView";
import DocumentLinkingOverlay from "@/features/documentView/components/annotationCard/DocumentLinkingOverlay";
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
    navigate("/");
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

  // const isUpdatingDocuments = useRef(false);

  const [viewedDocuments, setViewedDocuments] = useState<
    Array<{
      id: number;
      collectionId: number;
      title: string;
    }>
  >([]);

  // Properly typed elements selector
  // const allElements = useAppSelector((state: RootState) =>
  //   selectAllElementsForViewing(state, viewedDocuments)
  // );

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

  // const getElementBasedDocumentTitle = useCallback(
  //   (documentId: number): string | null => {
  //     const document = documents.find((doc) => doc.id === documentId);
  //     if (document && document.title && !document.title.includes("Document ")) {
  //       return document.title;
  //     }

  //     for (const collectionId in documentsByCollection) {
  //       const doc = documentsByCollection[collectionId].find(
  //         (d) => d.id === documentId
  //       );
  //       if (doc && doc.title && !doc.title.includes("Document ")) {
  //         return doc.title;
  //       }
  //     }

  //     const viewedDoc = viewedDocuments.find((doc) => doc.id === documentId);
  //     if (
  //       viewedDoc &&
  //       viewedDoc.title &&
  //       !viewedDoc.title.includes("Document ")
  //     ) {
  //       return viewedDoc.title;
  //     }

  //     return null;
  //   },
  //   [documents, documentsByCollection, viewedDocuments]
  // );

  // const replaceSecondaryDocument = useCallback(
  //   async (
  //     linkedDocumentId: number,
  //     linkedCollectionId: number,
  //     targetInfo: {
  //       sourceURI: string;
  //       start: number;
  //       end: number;
  //     },
  //     allTargets?: Array<{
  //       sourceURI: string;
  //       start: number;
  //       end: number;
  //       text: string;
  //     }>
  //   ) => {
  //     if (isUpdatingDocuments.current) {
  //       return;
  //     }

  //     isUpdatingDocuments.current = true;

  //     try {
  //       let linkedDocTitle = getDocumentTitle(
  //         linkedDocumentId,
  //         linkedCollectionId
  //       );

  //       if (
  //         linkedDocTitle.includes("Document ") &&
  //         !documentsByCollection[linkedCollectionId]
  //       ) {
  //         setIsLoadingDocuments(true);

  //         try {
  //           const payload = await dispatch(
  //             fetchDocumentsByCollection(linkedCollectionId)
  //           ).unwrap();
  //           setDocumentsByCollection((prev) => ({
  //             ...prev,
  //             [linkedCollectionId]: payload.documents.map((doc) => ({
  //               id: doc.id,
  //               title: doc.title,
  //             })),
  //           }));

  //           const elementBasedTitle =
  //             getElementBasedDocumentTitle(linkedDocumentId);
  //           linkedDocTitle =
  //             elementBasedTitle ||
  //             getDocumentTitle(linkedDocumentId, linkedCollectionId);
  //         } catch (error) {
  //           linkedDocTitle = `Document ${linkedDocumentId}`;
  //           console.error("Error fetching linked document:", error);
  //         } finally {
  //           setIsLoadingDocuments(false);
  //         }
  //       } else {
  //         const elementBasedTitle =
  //           getElementBasedDocumentTitle(linkedDocumentId);
  //         if (elementBasedTitle) {
  //           linkedDocTitle = elementBasedTitle;
  //         }
  //       }

  //       const primaryDocument = viewedDocuments[0];

  //       setViewedDocuments([
  //         primaryDocument,
  //         {
  //           id: linkedDocumentId,
  //           collectionId: linkedCollectionId,
  //           title: linkedDocTitle,
  //         },
  //       ]);

  //       if (pendingScrollTarget && viewedDocuments.length > 1) {
  //         const oldSecondaryId = viewedDocuments[1].id;
  //         if (pendingScrollTarget.documentId === oldSecondaryId) {
  //           setPendingScrollTarget(null);
  //         }
  //       }

  //       setPendingScrollTarget({
  //         documentId: linkedDocumentId,
  //         targetInfo,
  //         allTargets,
  //       });
  //     } finally {
  //       isUpdatingDocuments.current = false;
  //     }
  //   },
  //   [
  //     dispatch,
  //     documentsByCollection,
  //     getDocumentTitle,
  //     getElementBasedDocumentTitle,
  //     viewedDocuments,
  //     pendingScrollTarget,
  //   ]
  // );

  // const replacePrimaryDocument = useCallback(
  //   async (
  //     linkedDocumentId: number,
  //     linkedCollectionId: number,
  //     targetInfo: {
  //       sourceURI: string;
  //       start: number;
  //       end: number;
  //     },
  //     allTargets?: Array<{
  //       sourceURI: string;
  //       start: number;
  //       end: number;
  //       text: string;
  //     }>
  //   ) => {
  //     if (isUpdatingDocuments.current) {
  //       return;
  //     }

  //     isUpdatingDocuments.current = true;

  //     try {
  //       let linkedDocTitle = getDocumentTitle(
  //         linkedDocumentId,
  //         linkedCollectionId
  //       );

  //       if (
  //         linkedDocTitle.includes("Document ") &&
  //         !documentsByCollection[linkedCollectionId]
  //       ) {
  //         setIsLoadingDocuments(true);

  //         try {
  //           const payload = await dispatch(
  //             fetchDocumentsByCollection(linkedCollectionId)
  //           ).unwrap();
  //           setDocumentsByCollection((prev) => ({
  //             ...prev,
  //             [linkedCollectionId]: payload.documents.map((doc) => ({
  //               id: doc.id,
  //               title: doc.title,
  //             })),
  //           }));

  //           const elementBasedTitle =
  //             getElementBasedDocumentTitle(linkedDocumentId);
  //           linkedDocTitle =
  //             elementBasedTitle ||
  //             getDocumentTitle(linkedDocumentId, linkedCollectionId);
  //         } catch (error) {
  //           linkedDocTitle = `Document ${linkedDocumentId}`;
  //           console.error("Error fetching linked document:", error);
  //         } finally {
  //           setIsLoadingDocuments(false);
  //         }
  //       } else {
  //         const elementBasedTitle =
  //           getElementBasedDocumentTitle(linkedDocumentId);
  //         if (elementBasedTitle) {
  //           linkedDocTitle = elementBasedTitle;
  //         }
  //       }

  //       const secondaryDocument = viewedDocuments[1];

  //       setViewedDocuments([
  //         {
  //           id: linkedDocumentId,
  //           collectionId: linkedCollectionId,
  //           title: linkedDocTitle,
  //         },
  //         secondaryDocument,
  //       ]);

  //       if (pendingScrollTarget && viewedDocuments.length > 0) {
  //         const oldPrimaryId = viewedDocuments[0].id;
  //         if (pendingScrollTarget.documentId === oldPrimaryId) {
  //           setPendingScrollTarget(null);
  //         }
  //       }

  //       setPendingScrollTarget({
  //         documentId: linkedDocumentId,
  //         targetInfo,
  //         allTargets,
  //       });
  //     } finally {
  //       isUpdatingDocuments.current = false;
  //     }
  //   },
  //   [
  //     dispatch,
  //     documentsByCollection,
  //     getDocumentTitle,
  //     getElementBasedDocumentTitle,
  //     viewedDocuments,
  //     pendingScrollTarget,
  //   ]
  // );

  // const addLinkedDocumentAsSecondary = useCallback(
  //   async (
  //     linkedDocumentId: number,
  //     linkedCollectionId: number,
  //     targetInfo: {
  //       sourceURI: string;
  //       start: number;
  //       end: number;
  //     },
  //     allTargets?: Array<{
  //       sourceURI: string;
  //       start: number;
  //       end: number;
  //       text: string;
  //     }>
  //   ) => {
  //     if (isUpdatingDocuments.current) {
  //       return;
  //     }

  //     isUpdatingDocuments.current = true;

  //     try {
  //       try {
  //         await dispatch(fetchDocumentElements(linkedDocumentId)).unwrap();
  //       } catch (error) {
  //         console.error("Error fetching linked document elements:", error);
  //       }

  //       const linkedDocTitle = getDocumentTitle(
  //         linkedDocumentId,
  //         linkedCollectionId
  //       );

  //       setViewedDocuments(
  //         (
  //           prev: Array<{ id: number; collectionId: number; title: string }>
  //         ) => {
  //           const newDoc = {
  //             id: linkedDocumentId,
  //             collectionId: linkedCollectionId,
  //             title: linkedDocTitle,
  //           };
  //           return [...prev, newDoc];
  //         }
  //       );

  //       setPendingScrollTarget({
  //         documentId: linkedDocumentId,
  //         targetInfo,
  //         allTargets,
  //       });
  //     } finally {
  //       isUpdatingDocuments.current = false;
  //     }
  //   },
  //   [dispatch, getDocumentTitle]
  // );

  // const handleOpenLinkedDocument = useCallback(
  //   async (
  //     linkedDocumentId: number,
  //     linkedCollectionId: number,
  //     targetInfo: {
  //       sourceURI: string;
  //       start: number;
  //       end: number;
  //     },
  //     allTargets?: Array<{
  //       sourceURI: string;
  //       start: number;
  //       end: number;
  //       text: string;
  //     }>
  //   ) => {
  //     const targetDocumentId = linkedDocumentId;

  //     let sourceDocumentId: number | null = null;
  //     if (allTargets && allTargets.length > 1) {
  //       for (const target of allTargets) {
  //         const elementIdMatch = target.sourceURI.match(
  //           /\/DocumentElements\/(\d+)/
  //         );
  //         if (elementIdMatch) {
  //           const elementId = parseInt(elementIdMatch[1]);
  //           const element = allElements.find((el) => el.id === elementId);
  //           if (element && element.document_id !== targetDocumentId) {
  //             sourceDocumentId = element.document_id;
  //             break;
  //           }
  //         }
  //       }
  //     }

  //     if (isUpdatingDocuments.current) return;

  //     const sourceDocumentIndex = sourceDocumentId
  //       ? viewedDocuments.findIndex((doc) => doc.id === sourceDocumentId)
  //       : -1;

  //     if (sourceDocumentIndex === -1) return;

  //     const highlightTargets = () => {
  //       setTimeout(() => {
  //         scrollToAndHighlightText(targetInfo, allTargets);
  //       }, 2000);
  //     };

  //     try {
  //       if (viewedDocuments.length === 1) {
  //         await addLinkedDocumentAsSecondary(
  //           targetDocumentId,
  //           linkedCollectionId,
  //           targetInfo,
  //           allTargets
  //         );
  //         highlightTargets();
  //       } else if (viewedDocuments.length === 2) {
  //         const targetAlreadyViewed = viewedDocuments.some(
  //           (doc) => doc.id === targetDocumentId
  //         );
  //         if (targetAlreadyViewed) {
  //           highlightTargets();
  //           return;
  //         }

  //         if (sourceDocumentIndex === 0) {
  //           await replaceSecondaryDocument(
  //             targetDocumentId,
  //             linkedCollectionId,
  //             targetInfo,
  //             allTargets
  //           );
  //           highlightTargets();
  //         } else if (sourceDocumentIndex === 1) {
  //           await replacePrimaryDocument(
  //             targetDocumentId,
  //             linkedCollectionId,
  //             targetInfo,
  //             allTargets
  //           );
  //           highlightTargets();
  //         }
  //       }
  //     } catch (error) {
  //       console.error("Navigation error:", error);
  //     }
  //   },
  //   [
  //     viewedDocuments,
  //     allElements,
  //     addLinkedDocumentAsSecondary,
  //     replaceSecondaryDocument,
  //     replacePrimaryDocument,
  //   ]
  // );

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
          // onOpenLinkedDocument={handleOpenLinkedDocument}
          showLinkedTextHighlights={showLinkedTextHighlights}
          isAnnotationsPanelCollapsed={isAnnotationsPanelCollapsed}
          onToggleAnnotationsPanel={handleToggleAnnotationsPanel}
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
