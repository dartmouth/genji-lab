// src/features/documentView/components/annotationCard/ExternalReferenceDialog.tsx

import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Alert,
} from "@mui/material";
import { useAppDispatch, useAppSelector } from "@store/hooks";
import {
  selectAnnotationCreate,
  resetCreateAnnotation,
  externalReferenceThunks,
} from "@store";
import { useAuth } from "@hooks/useAuthContext";
import { makeExternalReferenceBody } from "@documentView/utils/makeAnnotationBody";

interface ExternalReferenceDialogProps {
  onClose: () => void;
}

const ExternalReferenceDialog: React.FC<ExternalReferenceDialogProps> = ({
  onClose,
}) => {
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const annotationCreate = useAppSelector(selectAnnotationCreate);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateUrl = (urlString: string): boolean => {
    try {
      const urlObj = new URL(urlString);
      return urlObj.protocol === "http:" || urlObj.protocol === "https:";
    } catch {
      return false;
    }
  };

  const handleSubmit = async () => {
    setError(null);

    // Validation
    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    if (!url.trim()) {
      setError("URL is required");
      return;
    }

    if (!validateUrl(url)) {
      setError(
        "Please enter a valid URL (must start with http:// or https://)"
      );
      return;
    }

    if (!annotationCreate.target.segments.length) {
      setError("No text selected");
      return;
    }

    if (!user?.id) {
      setError("User not authenticated");
      return;
    }

    setIsSubmitting(true);

    try {
      const metadata = {
        title: title.trim(),
        description: description.trim(),
        url: url.trim(),
      };

      const annotation = makeExternalReferenceBody(
        annotationCreate.target.documentCollectionId,
        annotationCreate.target.documentId,
        parseInt(annotationCreate.target.segments[0].sourceURI.split("/")[1]),
        user.id,
        metadata,
        annotationCreate.target.segments
      );

      await dispatch(
        externalReferenceThunks.saveAnnotation({
          annotation,
        })
      ).unwrap();

      // Success - close dialog and reset
      dispatch(resetCreateAnnotation());
      onClose();
    } catch (err) {
      console.error("Failed to create external reference:", err);
      setError("Failed to save external reference. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    dispatch(resetCreateAnnotation());
    onClose();
  };

  return (
    <Dialog
      open={true}
      onClose={handleCancel}
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
          color: '#2C656B'
        }}
      >
        Add External Reference
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <TextField
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            fullWidth
            required
            placeholder="Brief title for this reference"
            variant="outlined"
            disabled={isSubmitting}
          />

          <TextField
            label="URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            fullWidth
            required
            placeholder="https://example.com"
            variant="outlined"
            disabled={isSubmitting}
            type="url"
          />

          <TextField
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            multiline
            rows={3}
            placeholder="Optional description of this reference"
            variant="outlined"
            disabled={isSubmitting}
          />

          <Box
            sx={{
              p: 2,
              bgcolor: "grey.50",
              borderRadius: 1,
              fontSize: "0.875rem",
            }}
          >
            <strong>Selected text:</strong>
            <div style={{ marginTop: "8px", fontStyle: "italic" }}>
              {annotationCreate.target.selectedText.substring(0, 150)}
              {annotationCreate.target.selectedText.length > 150 && "..."}
            </div>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2, borderTop: 1, borderColor: "divider" }}>
        <Button onClick={handleCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={isSubmitting}
          sx={{ minWidth: 100 }}
        >
          {isSubmitting ? "Saving..." : "Save Reference"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ExternalReferenceDialog;
