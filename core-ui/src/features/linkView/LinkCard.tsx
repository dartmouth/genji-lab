// src/features/linkView/LinkCard.tsx

import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  Typography,
  IconButton,
  Box,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert,
  Snackbar,
} from "@mui/material";
import PushPinIcon from "@mui/icons-material/PushPin";
import PushPinOutlinedIcon from "@mui/icons-material/PushPinOutlined";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import CollectionsBookmarkIcon from "@mui/icons-material/CollectionsBookmark";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import DeleteIcon from "@mui/icons-material/Delete";
import { TextTarget } from "@documentView/types";
import { useAppSelector, useAppDispatch } from "@store/hooks";
import { selectAllLoadedElements } from "@store/selector/combinedSelectors";
import { selectAllDocuments } from "@store/slice/documentSlice";
import { selectAllDocumentCollections } from "@store/slice/documentCollectionSlice";
import { linkingAnnotations } from "@store/slice/annotationSlices";
import { useAuth } from "@hooks/useAuthContext";
import {
  startNavigationSession,
  addNavigationHighlight,
} from "@store/slice/navigationHighlightSlice";
import {
  resolveTargetGroupMetadata,
  type ResolvedTargetMetadata,
} from "./linkTargetUtils";

interface LinkCardProps {
  target: TextTarget | TextTarget[];
  isPinned: boolean;
  onTogglePin: (targetId: string) => void;
  showPinButton?: boolean;
  annotationId?: string;
  onDeleteSuccess?: () => void;
}

export const LinkCard: React.FC<LinkCardProps> = ({
  target,
  isPinned,
  onTogglePin,
  showPinButton = true,
  annotationId,
  onDeleteSuccess,
}) => {
  const { user } = useAuth();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  // Get data from Redux
  const allElements = useAppSelector(selectAllLoadedElements);
  const allDocuments = useAppSelector(selectAllDocuments);
  const allCollections = useAppSelector(selectAllDocumentCollections);

  // Get the full annotation to check creator
  const annotation = useAppSelector((state) =>
    annotationId
      ? linkingAnnotations.selectors.selectAnnotationById(state, annotationId)
      : undefined
  );

  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  // Normalize to array for consistent handling (memoized to avoid dependency issues)
  const targets = useMemo(() => {
    return Array.isArray(target) ? target : [target];
  }, [target]);

  // Use the first target's ID for pinning and deletion
  const cardId = targets[0]?.id ? String(targets[0].id) : undefined;

  // Check if current user can delete this target
  const canDelete =
    annotation &&
    user &&
    cardId &&
    (user.roles?.includes("admin") ||
      user.roles?.includes("verified_scholar") ||
      user.id === annotation.creator_id);

  // Resolve metadata for all targets in this group
  const groupMetadata = useMemo(() => {
    return resolveTargetGroupMetadata(
      targets,
      allElements,
      allDocuments,
      allCollections
    );
  }, [targets, allElements, allDocuments, allCollections]);

  const {
    resolvedTargets: unsortedTargets,
    isSameDocument,
    isSameCollection,
    commonDocumentTitle,
    commonCollectionTitle,
  } = groupMetadata;

  // Sort resolved targets by element ID to display in document order
  const resolvedTargets = useMemo(() => {
    return [...unsortedTargets].sort((a, b) => {
      // Sort by element ID (paragraph order in document)
      if (a.elementId === null) return 1;
      if (b.elementId === null) return -1;
      return a.elementId - b.elementId;
    });
  }, [unsortedTargets]);

  const handlePinClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (cardId) {
      onTogglePin(cardId);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
    setDeleteError(null);
  };

  const handleDeleteConfirm = async () => {
    if (!annotationId || !cardId) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      const result = await dispatch(
        linkingAnnotations.thunks.removeTarget({
          annotationId: parseInt(annotationId),
          targetId: parseInt(cardId),
        })
      ).unwrap();

      // Success
      setShowSuccessMessage(true);
      setShowDeleteConfirm(false);

      // If result is null, the entire annotation was deleted
      if (result === null) {
        // Navigate back since the whole link is gone
        setTimeout(() => {
          navigate(-1);
        }, 1000);
      } else {
        // Just this target was removed, trigger callback
        if (onDeleteSuccess) {
          onDeleteSuccess();
        }
      }
    } catch (error) {
      console.error("Failed to delete target:", error);
      setDeleteError("Failed to delete target. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleViewInDocument = (e: React.MouseEvent) => {
    e.stopPropagation();

    // Get the first resolved target to find document and collection IDs
    const firstResolved = resolvedTargets[0];
    if (
      !firstResolved ||
      !firstResolved.documentId ||
      !firstResolved.documentCollectionId
    ) {
      console.error("Cannot navigate: missing document or collection ID");
      return;
    }

    // Create a navigation session
    const sessionId = `link-nav-${Date.now()}`;
    dispatch(startNavigationSession({ sessionId }));

    // Add navigation highlights for all targets in this card
    targets.forEach((target) => {
      if ("source" in target) {
        dispatch(
          addNavigationHighlight({
            elementURI: target.source,
            type: "target",
            sessionId,
          })
        );
      }
    });

    // Navigate to the document
    navigate(
      `/collections/${firstResolved.documentCollectionId}/documents/${firstResolved.documentId}`
    );
  };

  return (
    <>
      <Card
        sx={{
          mb: 2,
          position: "relative",
          transition: "all 0.2s ease-in-out",
          "&:hover": {
            boxShadow: 4,
          },
          border: isPinned ? "2px solid" : "1px solid",
          borderColor: isPinned ? "primary.main" : "divider",
        }}
      >
        <CardContent>
          {/* Header with collection/document info and action buttons */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              mb: 2,
            }}
          >
            <Box sx={{ flex: 1 }}>
              {/* Collection title - show once if all targets are from same collection */}
              {isSameCollection &&
                commonCollectionTitle &&
                commonCollectionTitle !== "Unknown Collection" && (
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      mb: 0.5,
                    }}
                  >
                    <CollectionsBookmarkIcon fontSize="small" color="action" />
                    <Typography variant="caption" color="text.secondary">
                      {commonCollectionTitle}
                    </Typography>
                  </Box>
                )}

              {/* Document title - show once if all targets are from same document */}
              {isSameDocument &&
                commonDocumentTitle &&
                commonDocumentTitle !== "Unknown Document" && (
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      mb: 1,
                    }}
                  >
                    <MenuBookIcon fontSize="small" color="primary" />
                    <Typography
                      variant="subtitle1"
                      fontWeight="medium"
                      color="primary.main"
                    >
                      {commonDocumentTitle}
                    </Typography>
                  </Box>
                )}
            </Box>

            {/* Action buttons */}
            <Box sx={{ display: "flex", gap: 0.5, flexShrink: 0, ml: 1 }}>
              {/* Delete button - only for OP/admin */}
              {canDelete && (
                <Tooltip title="Delete this target" arrow>
                  <IconButton
                    onClick={handleDeleteClick}
                    size="small"
                    color="error"
                    aria-label="Delete target"
                    sx={{
                      "&:hover": {
                        backgroundColor: "error.light",
                      },
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}

              {/* View in Document button */}
              <Tooltip title="View in Document" arrow>
                <IconButton
                  onClick={handleViewInDocument}
                  size="small"
                  color="primary"
                  aria-label="View in document"
                  sx={{
                    "&:hover": {
                      backgroundColor: "primary.light",
                    },
                  }}
                >
                  <OpenInNewIcon fontSize="small" />
                </IconButton>
              </Tooltip>

              {/* Pin button */}
              {showPinButton && cardId && (
                <Tooltip title={isPinned ? "Unpin" : "Pin"} arrow>
                  <IconButton
                    onClick={handlePinClick}
                    size="small"
                    color={isPinned ? "primary" : "default"}
                    aria-label={isPinned ? "Unpin target" : "Pin target"}
                    sx={{
                      "&:hover": {
                        backgroundColor: isPinned
                          ? "primary.light"
                          : "action.hover",
                      },
                    }}
                  >
                    {isPinned ? <PushPinIcon /> : <PushPinOutlinedIcon />}
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          </Box>

          {/* Display each target's text */}
          <Box sx={{ mt: 2 }}>
            {resolvedTargets.map(
              (resolved: ResolvedTargetMetadata, index: number) => {
                return (
                  <React.Fragment key={targets[index]?.id || index}>
                    {index > 0 && <Box sx={{ my: 2 }} />}
                    <Box>
                      {/* Quoted text */}
                      <Typography
                        variant="body1"
                        component="blockquote"
                        sx={{
                          fontStyle: "italic",
                          color: "text.primary",
                          lineHeight: 1.6,
                          pl: 2,
                          borderLeft: "3px solid",
                          borderColor: "primary.light",
                          position: "relative",
                        }}
                      >
                        {resolved.quotedText}
                      </Typography>
                    </Box>
                  </React.Fragment>
                );
              }
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={showDeleteConfirm}
        onClose={handleDeleteCancel}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 600, color: "error.main" }}>
          Delete Target from Link?
        </DialogTitle>

        <DialogContent>
          {deleteError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {deleteError}
            </Alert>
          )}
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Are you sure you want to remove this target from the link? This
            action cannot be undone.
          </Typography>
          <Box
            sx={{
              p: 1.5,
              bgcolor: "grey.50",
              borderRadius: 1,
              maxHeight: "200px",
              overflow: "auto",
            }}
          >
            {resolvedTargets.map((resolved, index) => (
              <Typography
                key={index}
                variant="caption"
                component="div"
                sx={{
                  fontStyle: "italic",
                  mb: index < resolvedTargets.length - 1 ? 1 : 0,
                }}
              >
                "{resolved.quotedText.substring(0, 100)}
                {resolved.quotedText.length > 100 && "..."}"
              </Typography>
            ))}
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleDeleteCancel} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            variant="contained"
            color="error"
            disabled={isDeleting}
            sx={{ minWidth: 100 }}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success Snackbar */}
      <Snackbar
        open={showSuccessMessage}
        autoHideDuration={3000}
        onClose={() => setShowSuccessMessage(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setShowSuccessMessage(false)}
          severity="success"
          sx={{ width: "100%" }}
        >
          Target deleted successfully
        </Alert>
      </Snackbar>
    </>
  );
};
