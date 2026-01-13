// src/features/documentView/components/externalReferences/ExternalReferencePreviewModal.tsx

import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Link,
  IconButton,
  Alert,
  Snackbar,
} from "@mui/material";
import {
  OpenInNew as OpenInNewIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import { useAuth } from "@hooks/useAuthContext";
import { useAppDispatch } from "@store/hooks";
import { externalReferenceThunks } from "@store";
import { Annotation } from "@documentView/types";

interface ExternalReferencePreviewModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  url: string;
  annotation?: Annotation;
  onDeleteSuccess?: () => void;
}

const ExternalReferencePreviewModal: React.FC<
  ExternalReferencePreviewModalProps
> = ({
  open,
  onClose,
  title,
  description,
  url,
  annotation,
  onDeleteSuccess,
}) => {
  const { user } = useAuth();
  const dispatch = useAppDispatch();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  // Check if current user can delete this reference
  const canDelete =
    annotation &&
    user &&
    (user.roles?.includes("admin") || user.id === annotation.creator_id);

  const handleOpenInNewTab = () => {
    window.open(url, "_blank", "noopener,noreferrer");
    onClose();
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
    setDeleteError(null);
  };

  const handleDeleteConfirm = async () => {
    if (!annotation) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await dispatch(
        externalReferenceThunks.deleteAnnotation({
          annotationId: parseInt(annotation.id),
        })
      ).unwrap();

      // Success - show message and close
      setShowSuccessMessage(true);
      setShowDeleteConfirm(false);

      // Call the callback to refetch references
      if (onDeleteSuccess) {
        onDeleteSuccess();
      }

      // Close the modal after a brief delay
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (error) {
      console.error("Failed to delete external reference:", error);
      setDeleteError("Failed to delete reference. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    if (!isDeleting) {
      setShowDeleteConfirm(false);
      setDeleteError(null);
      onClose();
    }
  };

  return (
    <>
      <Dialog
        open={open && !showDeleteConfirm}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: 3,
          },
        }}
      >
        <DialogTitle
          sx={{
            fontWeight: 600,
            fontSize: "1.25rem",
            borderBottom: 1,
            borderColor: "divider",
            pb: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>External Reference</span>
          {canDelete && (
            <IconButton
              onClick={handleDeleteClick}
              size="small"
              sx={{
                color: "error.main",
                "&:hover": {
                  backgroundColor: "error.light",
                  color: "error.dark",
                },
              }}
              title="Delete reference"
            >
              <DeleteIcon />
            </IconButton>
          )}
        </DialogTitle>

        <DialogContent sx={{ pt: 3 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Box>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                gutterBottom
              >
                Title
              </Typography>
              <Typography variant="body1" fontWeight={500}>
                {title}
              </Typography>
            </Box>

            {description && (
              <Box>
                <Typography
                  variant="subtitle2"
                  color="text.secondary"
                  gutterBottom
                >
                  Description
                </Typography>
                <Typography variant="body2">{description}</Typography>
              </Box>
            )}

            <Box>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                gutterBottom
              >
                URL
              </Typography>
              <Link
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                sx={{
                  wordBreak: "break-all",
                  fontSize: "0.875rem",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 0.5,
                }}
              >
                {url}
                <OpenInNewIcon sx={{ fontSize: 16 }} />
              </Link>
            </Box>
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 2, borderTop: 1, borderColor: "divider" }}>
          <Button onClick={handleClose}>Close</Button>
          <Button
            onClick={handleOpenInNewTab}
            variant="contained"
            startIcon={<OpenInNewIcon />}
            sx={{ backgroundColor: "#2C656B" }}
          >
            Open in New Tab
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={showDeleteConfirm}
        onClose={handleDeleteCancel}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: 3,
          },
        }}
      >
        <DialogTitle
          sx={{
            fontWeight: 600,
            fontSize: "1.125rem",
            color: "error.main",
          }}
        >
          Delete External Reference?
        </DialogTitle>

        <DialogContent>
          {deleteError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {deleteError}
            </Alert>
          )}
          <Typography variant="body2" color="text.secondary">
            Are you sure you want to delete this reference? This action cannot
            be undone.
          </Typography>
          <Box
            sx={{
              mt: 2,
              p: 1.5,
              bgcolor: "grey.50",
              borderRadius: 1,
              fontSize: "0.875rem",
            }}
          >
            <strong>{title}</strong>
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 2, borderTop: 1, borderColor: "divider" }}>
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
          External reference deleted successfully
        </Alert>
      </Snackbar>
    </>
  );
};

export default ExternalReferencePreviewModal;
