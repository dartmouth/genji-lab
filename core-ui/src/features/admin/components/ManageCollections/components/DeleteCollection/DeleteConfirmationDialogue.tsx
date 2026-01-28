// components/DeleteCollection/DeleteConfirmationDialog.tsx

import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  TextField,
} from "@mui/material";

import { CollectionStats } from "../../types";

export interface DeleteConfirmationDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Collection statistics and details */
  collectionStats: CollectionStats | null;
  /** Current confirmation text value */
  confirmationText: string;
  /** Handler for confirmation text changes */
  onConfirmationTextChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  /** Handler for confirm action */
  onConfirm: () => void;
  /** Handler for cancel action */
  onCancel: () => void;
  /** Whether the confirmation text is valid */
  isConfirmationValid: boolean;
}

export const DeleteConfirmationDialog: React.FC<DeleteConfirmationDialogProps> = ({
  open,
  collectionStats,
  confirmationText,
  onConfirmationTextChange,
  onConfirm,
  onCancel,
  isConfirmationValid,
}) => {
  if (!collectionStats) return null;

  const message = `Are you sure you want to delete the collection "${collectionStats.title}"?

This will permanently delete:
• ${collectionStats.document_count} documents
• ${collectionStats.element_count} paragraphs
• ${collectionStats.scholarly_annotation_count} scholarly annotations
• ${collectionStats.comment_count} comments

This action cannot be undone.

To confirm, please type the collection name exactly as shown:
"${collectionStats.title}"`;

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      aria-labelledby="delete-dialog-title"
      aria-describedby="delete-dialog-description"
      maxWidth="md"
      fullWidth
    >
      <DialogTitle id="delete-dialog-title" sx={{ color: "error.main" }}>
        Confirm Collection Deletion
      </DialogTitle>
      <DialogContent>
        <DialogContentText
          id="delete-dialog-description"
          sx={{ marginBottom: 2, whiteSpace: "pre-line" }}
        >
          {message}
        </DialogContentText>

        <TextField
          autoFocus
          margin="dense"
          label="Type collection name to confirm"
          type="text"
          fullWidth
          variant="outlined"
          value={confirmationText}
          onChange={onConfirmationTextChange}
          error={confirmationText !== "" && !isConfirmationValid}
          helperText={
            confirmationText !== "" && !isConfirmationValid
              ? "Collection name must match exactly"
              : ""
          }
          sx={{ mt: 2 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button
          onClick={onConfirm}
          color="error"
          variant="contained"
          disabled={!isConfirmationValid}
        >
          DELETE COLLECTION
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DeleteConfirmationDialog;