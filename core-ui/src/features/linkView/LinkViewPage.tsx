// src/pages/LinkViewPage.tsx

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "@store/hooks";
import { linkingAnnotations } from "@store";
import { fetchAnnotationById } from "@store/thunk/fetchAnnotationById";
import { fetchDocumentElements } from "@store/slice/documentElementsSlice";
import { fetchAllDocuments } from "@store/slice/documentSlice";
import { fetchDocumentCollections } from "@store/slice/documentCollectionSlice";
import { selectAllLoadedElements } from "@store/selector/combinedSelectors";
import { useAuth } from "@hooks/useAuthContext";
import {
  Box,
  Container,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Paper,
  Pagination,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DeleteIcon from "@mui/icons-material/Delete";
import { TextTarget } from "@documentView/types";
import { LinkCard } from "./LinkCard";
import { PinnedTargetsPanel } from "./PinnedTargetsPanel";
import { extractElementIdFromSource } from "./linkTargetUtils";

const TARGETS_PER_PAGE = 10;

type TargetGroup = TextTarget | TextTarget[];

export const LinkViewPage: React.FC = () => {
  const { annotationId } = useParams<{ annotationId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pinnedGroupIds, setPinnedGroupIds] = useState<Set<string>>(new Set());
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [dataLoading, setDataLoading] = useState(true);

  // Delete entire annotation state
  const [showDeleteAnnotationConfirm, setShowDeleteAnnotationConfirm] =
    useState(false);
  const [isDeletingAnnotation, setIsDeletingAnnotation] = useState(false);
  const [deleteAnnotationError, setDeleteAnnotationError] = useState<
    string | null
  >(null);
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);

  const annotation = useAppSelector((state) =>
    annotationId
      ? linkingAnnotations.selectors.selectAnnotationById(state, annotationId)
      : undefined
  );

  const allLoadedElements = useAppSelector(selectAllLoadedElements);
  const allDocuments = useAppSelector((state) => state.documents.allDocuments);
  const allCollections = useAppSelector(
    (state) => state.documentCollections.collections
  );

  // Check if current user can delete entire annotation (admin only)
  const canDeleteAnnotation = user && user.roles?.includes("admin");

  // Fetch annotation if not loaded
  useEffect(() => {
    if (!annotationId) {
      setError("No annotation ID provided");
      return;
    }

    if (!annotation && !loading) {
      setLoading(true);
      setError(null);

      dispatch(fetchAnnotationById(annotationId))
        .unwrap()
        .then((fetchedAnnotation) => {
          dispatch(linkingAnnotations.actions.addAnnotation(fetchedAnnotation));
          setLoading(false);
        })
        .catch((err) => {
          setError(err || "Failed to fetch annotation");
          setLoading(false);
        });
    }
  }, [annotationId, annotation, loading, dispatch]);

  // Load all necessary data for metadata resolution
  useEffect(() => {
    if (!annotation) return;

    const loadData = async () => {
      setDataLoading(true);

      try {
        // 1. Extract all unique element IDs from annotation targets
        const elementIds = new Set<number>();
        annotation.target.forEach((targetGroup) => {
          const targets = Array.isArray(targetGroup)
            ? targetGroup
            : [targetGroup];
          targets.forEach((target) => {
            if (target.type !== "Object" && "source" in target) {
              const elementId = extractElementIdFromSource(target.source);
              if (elementId) {
                elementIds.add(elementId);
              }
            }
          });
        });

        // 2. Check which elements are not loaded yet
        const loadedElementIds = new Set(allLoadedElements.map((el) => el.id));
        const missingElementIds = Array.from(elementIds).filter(
          (id) => !loadedElementIds.has(id)
        );

        if (missingElementIds.length === 0) {
          // All elements already loaded, but make sure documents/collections are loaded too
          if (allDocuments.length === 0) {
            await dispatch(fetchAllDocuments()).unwrap();
          }
          if (allCollections.length === 0) {
            await dispatch(fetchDocumentCollections({})).unwrap();
          }
          setDataLoading(false);
          return;
        }

        // 3. Fetch missing elements by ID
        const documentIdsNeeded = new Set<number>();

        for (const elementId of missingElementIds) {
          try {
            // Fetch individual element - the endpoint returns element with document info
            const response = await fetch(`/api/v1/elements/${elementId}`);
            if (response.ok) {
              const elementData = await response.json();
              // Track which document this element belongs to
              if (elementData.document_id) {
                documentIdsNeeded.add(elementData.document_id);
              }
            }
          } catch (err) {
            console.warn(`Failed to fetch element ${elementId}:`, err);
          }
        }

        // 4. Fetch elements for all needed documents
        for (const docId of documentIdsNeeded) {
          try {
            await dispatch(fetchDocumentElements(docId)).unwrap();
          } catch (err) {
            console.warn(`Failed to load elements for document ${docId}:`, err);
          }
        }

        // 5. Fetch documents if not loaded (we need full document list for document_collection_id lookup)
        if (allDocuments.length === 0) {
          await dispatch(fetchAllDocuments()).unwrap();
        }

        // 6. Fetch collections if not loaded (these are typically small datasets)
        if (allCollections.length === 0) {
          await dispatch(fetchDocumentCollections({})).unwrap();
        }
      } catch (err) {
        console.error("Failed to load metadata:", err);
      } finally {
        setDataLoading(false);
      }
    };

    loadData();
  }, [annotation, dispatch, allDocuments, allCollections, allLoadedElements]);

  const targetGroups = useMemo((): TargetGroup[] => {
    if (!annotation?.target) return [];

    return annotation.target
      .map((target): TargetGroup | null => {
        if (Array.isArray(target)) {
          const textTargets = target.filter(
            (t): t is TextTarget => t.type !== "Object"
          );
          return textTargets.length > 0 ? textTargets : null;
        } else if (target.type !== "Object") {
          return target as TextTarget;
        }
        return null;
      })
      .filter((group): group is TargetGroup => group !== null);
  }, [annotation]);

  // Create mapping: individual target ID -> group ID
  const { groupIdMap, targetToGroupMap } = useMemo(() => {
    const groupIds = new Map<number, string>();
    const targetToGroup = new Map<string, string>();

    targetGroups.forEach((group, groupIndex) => {
      const targets = Array.isArray(group) ? group : [group];

      // Create stable group ID from all target IDs (sorted for consistency)
      const targetIds = targets
        .map((t) => String(t.id))
        .filter((id) => id !== "null" && id !== "undefined")
        .sort();

      const groupId =
        targetIds.length > 0 ? targetIds.join("-") : `group-${groupIndex}`;

      groupIds.set(groupIndex, groupId);

      // Map each individual target ID to this group ID
      targets.forEach((target) => {
        if (target.id) {
          targetToGroup.set(String(target.id), groupId);
        }
      });
    });

    return { groupIdMap: groupIds, targetToGroupMap: targetToGroup };
  }, [targetGroups]);

  // Initialize pinned groups from URL parameters
  useEffect(() => {
    const pinnedParam = searchParams.get("pinned");
    if (pinnedParam && targetToGroupMap.size > 0) {
      const targetIdsFromUrl = pinnedParam.split(",").filter(Boolean);

      // Find which groups contain these target IDs
      const groupIdsToPin = new Set<string>();
      targetIdsFromUrl.forEach((targetId) => {
        const groupId = targetToGroupMap.get(targetId);
        if (groupId) {
          groupIdsToPin.add(groupId);
        }
      });

      if (groupIdsToPin.size > 0) {
        setPinnedGroupIds(groupIdsToPin);
      }
    }
  }, [searchParams, targetToGroupMap]);

  const getGroupId = useCallback(
    (_group: TargetGroup, index: number): string => {
      return groupIdMap.get(index) || `group-${index}`;
    },
    [groupIdMap]
  );

  const { pinnedGroups, unpinnedGroups } = useMemo(() => {
    const pinned: { group: TargetGroup; id: string }[] = [];
    const unpinned: { group: TargetGroup; id: string }[] = [];

    targetGroups.forEach((group, index) => {
      const groupId = getGroupId(group, index);
      const groupData = { group, id: groupId };

      if (pinnedGroupIds.has(groupId)) {
        pinned.push(groupData);
      } else {
        unpinned.push(groupData);
      }
    });

    return { pinnedGroups: pinned, unpinnedGroups: unpinned };
  }, [targetGroups, pinnedGroupIds, getGroupId]);

  const totalPages = Math.ceil(unpinnedGroups.length / TARGETS_PER_PAGE);
  const startIndex = (currentPage - 1) * TARGETS_PER_PAGE;
  const endIndex = startIndex + TARGETS_PER_PAGE;
  const paginatedGroups = unpinnedGroups.slice(startIndex, endIndex);

  const handlePageChange = useCallback(
    (_event: React.ChangeEvent<unknown>, page: number) => {
      setCurrentPage(page);
      const scrollContainer = document.getElementById(
        "unpinned-content-scroll"
      );
      if (scrollContainer) {
        scrollContainer.scrollTo({ top: 0, behavior: "smooth" });
      }
    },
    []
  );

  // Handle pin toggle - works with ANY target ID from a group
  const handleTogglePin = useCallback(
    (targetId: string) => {
      const groupId = targetToGroupMap.get(targetId);

      if (!groupId) {
        console.warn(`Target ID ${targetId} not found in any group`);
        return;
      }

      setPinnedGroupIds((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(groupId)) {
          newSet.delete(groupId);
        } else {
          newSet.add(groupId);
        }

        // Update URL with representative target IDs
        setTimeout(() => {
          if (newSet.size > 0) {
            const targetIdsForUrl: string[] = [];
            newSet.forEach((gId) => {
              for (const [tId, gIdMap] of targetToGroupMap.entries()) {
                if (gIdMap === gId) {
                  targetIdsForUrl.push(tId);
                  return;
                }
              }
            });
            setSearchParams({ pinned: targetIdsForUrl.join(",") });
          } else {
            setSearchParams({});
          }
        }, 0);

        return newSet;
      });

      setCurrentPage(1);
    },
    [targetToGroupMap, setSearchParams]
  );

  const handleBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const handleDeleteAnnotationClick = () => {
    setShowDeleteAnnotationConfirm(true);
  };

  const handleDeleteAnnotationCancel = () => {
    setShowDeleteAnnotationConfirm(false);
    setDeleteAnnotationError(null);
  };

  const handleDeleteAnnotationConfirm = async () => {
    if (!annotationId) return;

    setIsDeletingAnnotation(true);
    setDeleteAnnotationError(null);

    try {
      await dispatch(
        linkingAnnotations.thunks.deleteAnnotation({
          annotationId: parseInt(annotationId),
        })
      ).unwrap();

      // Success
      setShowDeleteSuccess(true);
      setShowDeleteAnnotationConfirm(false);

      // Navigate back after brief delay
      setTimeout(() => {
        navigate(-1);
      }, 1500);
    } catch (error) {
      console.error("Failed to delete annotation:", error);
      setDeleteAnnotationError("Failed to delete link. Please try again.");
    } finally {
      setIsDeletingAnnotation(false);
    }
  };

  const handleTargetDeleteSuccess = () => {
    // Re-fetch the annotation to get updated targets
    if (annotationId) {
      dispatch(fetchAnnotationById(annotationId))
        .unwrap()
        .then((fetchedAnnotation) => {
          dispatch(linkingAnnotations.actions.addAnnotation(fetchedAnnotation));
        })
        .catch((err) => {
          console.error("Failed to refresh annotation:", err);
        });
    }
  };

  if (loading || dataLoading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, textAlign: "center" }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          {loading ? "Loading annotation..." : "Loading metadata..."}
        </Typography>
      </Container>
    );
  }

  if (error || !annotation) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || "Annotation not found"}
        </Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
          variant="outlined"
        >
          Go Back
        </Button>
      </Container>
    );
  }

  const linkName = annotation.body?.value || "Unnamed Link";

  return (
    <>
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
            <Button startIcon={<ArrowBackIcon />} onClick={handleBack}>
              Back
            </Button>
            {canDeleteAnnotation && (
              <Tooltip title="Delete entire link (admin only)" arrow>
                <IconButton
                  onClick={handleDeleteAnnotationClick}
                  color="error"
                  sx={{
                    ml: "auto",
                    "&:hover": {
                      backgroundColor: "error.light",
                    },
                  }}
                >
                  <DeleteIcon />
                </IconButton>
              </Tooltip>
            )}
          </Box>
          <Typography variant="h3" component="h1" gutterBottom>
            {linkName}
          </Typography>
        </Box>

        <Box
          sx={{
            display: "flex",
            gap: 2,
            alignItems: "stretch",
            height: "calc(100vh - 250px)",
            minHeight: "600px",
          }}
        >
          <PinnedTargetsPanel
            pinnedTargets={pinnedGroups.map((pg) => pg.group)}
            onTogglePin={handleTogglePin}
            isOpen={isPanelOpen}
            onTogglePanel={() => setIsPanelOpen(!isPanelOpen)}
            annotationId={annotationId}
            onDeleteSuccess={handleTargetDeleteSuccess}
          />

          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Paper
              sx={{
                p: 3,
                display: "flex",
                flexDirection: "column",
                height: "100%",
                overflow: "hidden",
              }}
            >
              {totalPages > 1 && (
                <Box sx={{ mb: 2, flexShrink: 0 }}>
                  <Pagination
                    count={totalPages}
                    page={currentPage}
                    onChange={handlePageChange}
                    color="primary"
                    size="large"
                    showFirstButton
                    showLastButton
                    sx={{ display: "flex", justifyContent: "center" }}
                  />
                </Box>
              )}

              <Box
                id="unpinned-content-scroll"
                sx={{
                  flex: 1,
                  overflowY: "auto",
                  overflowX: "hidden",
                  pr: 1,
                  minHeight: 0,
                  "&::-webkit-scrollbar": {
                    width: "10px",
                  },
                  "&::-webkit-scrollbar-track": {
                    backgroundColor: "background.default",
                    borderRadius: "5px",
                  },
                  "&::-webkit-scrollbar-thumb": {
                    backgroundColor: "primary.main",
                    borderRadius: "5px",
                    "&:hover": {
                      backgroundColor: "primary.dark",
                    },
                  },
                }}
              >
                {paginatedGroups.length > 0 ? (
                  <>
                    {paginatedGroups.map(({ group, id }) => (
                      <LinkCard
                        key={id}
                        target={group}
                        isPinned={false}
                        onTogglePin={handleTogglePin}
                        annotationId={annotationId}
                        onDeleteSuccess={handleTargetDeleteSuccess}
                      />
                    ))}
                  </>
                ) : (
                  <Alert severity="info">
                    {unpinnedGroups.length === 0 && pinnedGroups.length > 0
                      ? "All target groups are pinned"
                      : "No targets available"}
                  </Alert>
                )}
              </Box>

              {totalPages > 1 && (
                <Box sx={{ mt: 2, flexShrink: 0 }}>
                  <Pagination
                    count={totalPages}
                    page={currentPage}
                    onChange={handlePageChange}
                    color="primary"
                    size="large"
                    showFirstButton
                    showLastButton
                    sx={{ display: "flex", justifyContent: "center" }}
                  />
                </Box>
              )}

              {unpinnedGroups.length > 0 && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    display: "block",
                    textAlign: "center",
                    mt: 1,
                    flexShrink: 0,
                  }}
                >
                  Showing {startIndex + 1}-
                  {Math.min(endIndex, unpinnedGroups.length)} of{" "}
                  {unpinnedGroups.length} unpinned{" "}
                  {unpinnedGroups.length === 1 ? "group" : "groups"}
                </Typography>
              )}
            </Paper>
          </Box>
        </Box>
      </Container>

      {/* Delete Entire Annotation Confirmation Dialog */}
      <Dialog
        open={showDeleteAnnotationConfirm}
        onClose={handleDeleteAnnotationCancel}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 600, color: "error.main" }}>
          Delete Entire Link?
        </DialogTitle>

        <DialogContent>
          {deleteAnnotationError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {deleteAnnotationError}
            </Alert>
          )}
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Are you sure you want to delete this entire link? This will remove
            all targets and cannot be undone.
          </Typography>
          <Box
            sx={{
              p: 2,
              bgcolor: "grey.50",
              borderRadius: 1,
            }}
          >
            <Typography variant="subtitle2" fontWeight="bold">
              {linkName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {targetGroups.length} target{targetGroups.length !== 1 ? "s" : ""}
            </Typography>
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={handleDeleteAnnotationCancel}
            disabled={isDeletingAnnotation}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteAnnotationConfirm}
            variant="contained"
            color="error"
            disabled={isDeletingAnnotation}
            sx={{ minWidth: 120 }}
          >
            {isDeletingAnnotation ? "Deleting..." : "Delete Link"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success Snackbar */}
      <Snackbar
        open={showDeleteSuccess}
        autoHideDuration={3000}
        onClose={() => setShowDeleteSuccess(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setShowDeleteSuccess(false)}
          severity="success"
          sx={{ width: "100%" }}
        >
          Link deleted successfully
        </Alert>
      </Snackbar>
    </>
  );
};
