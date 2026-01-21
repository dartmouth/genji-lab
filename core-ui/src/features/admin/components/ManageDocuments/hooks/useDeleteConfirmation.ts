// ManageDocuments/hooks/useDeleteConfirmation.ts

import { useState, useCallback } from "react";
import { DeleteConfirmDialogState, DocumentToDelete } from "../types";

const initialState: DeleteConfirmDialogState = {
  open: false,
  title: "",
  message: "",
  documentsToDelete: [],
};

export interface ShowDeleteConfirmationParams {
  title: string;
  message: string;
  documentsToDelete: DocumentToDelete[];
}

export const useDeleteConfirmation = () => {
  const [deleteConfirmDialog, setDeleteConfirmDialog] =
    useState<DeleteConfirmDialogState>(initialState);

  const showDeleteConfirmation = useCallback(
    ({ title, message, documentsToDelete }: ShowDeleteConfirmationParams) => {
      setDeleteConfirmDialog({
        open: true,
        title,
        message,
        documentsToDelete,
      });
    },
    []
  );

  const hideDeleteConfirmation = useCallback(() => {
    setDeleteConfirmDialog((prev) => ({ ...prev, open: false }));
  }, []);

  const resetDeleteConfirmation = useCallback(() => {
    setDeleteConfirmDialog(initialState);
  }, []);

  return {
    deleteConfirmDialog,
    showDeleteConfirmation,
    hideDeleteConfirmation,
    resetDeleteConfirmation,
  };
};