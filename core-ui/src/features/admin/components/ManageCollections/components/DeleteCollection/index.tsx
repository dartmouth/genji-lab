// components/DeleteCollection/index.tsx

import React, { useState } from "react";
import {
  Typography,
  Button,
  Box,
  LinearProgress,
  SelectChangeEvent,
} from "@mui/material";
import axios, { AxiosInstance } from "axios";

import { fetchDocumentCollections, useAppDispatch } from "@store";

import { CollectionSelect } from "../../shared/CollectionSelect";
import { CollectionDetailsCard } from "../../shared/CollectionDetailsCard";
import { StyledForm } from "../../shared/StyledForm";
import { DeleteConfirmationDialog } from "./DeleteConfirmationDialogue";
import {
  DocumentCollection,
  NotificationState,
  CollectionStats,
} from "../../types";

const api: AxiosInstance = axios.create({
  baseURL: "/api/v1",
  timeout: 10000,
});

export interface DeleteCollectionProps {
  /** List of available collections */
  collections: DocumentCollection[];
  /** Callback when deletion succeeds */
  onSuccess: () => void;
  /** Function to show notifications */
  showNotification: (
    message: string,
    severity: NotificationState["severity"]
  ) => void;
}

export const DeleteCollection: React.FC<DeleteCollectionProps> = ({
  collections,
  onSuccess,
  showNotification,
}) => {
  const dispatch = useAppDispatch();

  const [selectedCollection, setSelectedCollection] = useState<string>("");
  const [collectionStats, setCollectionStats] = useState<CollectionStats | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [isLoadingStats, setIsLoadingStats] = useState<boolean>(false);
  const [showProgress, setShowProgress] = useState<boolean>(false);
  const [deleteProgress, setDeleteProgress] = useState<number>(0);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState<boolean>(false);
  const [confirmationText, setConfirmationText] = useState<string>("");

  const handleCollectionSelect = async (event: SelectChangeEvent<string>): Promise<void> => {
    const collectionId = event.target.value;
    setSelectedCollection(collectionId);
    setCollectionStats(null);
    setConfirmationText("");

    if (collectionId) {
      setIsLoadingStats(true);
      try {
        const response = await api.get(`/collections/${collectionId}`);
        const stats = response.data;
        setCollectionStats({
          document_count: stats.document_count || 0,
          element_count: stats.element_count || 0,
          scholarly_annotation_count: stats.scholarly_annotation_count || 0,
          comment_count: stats.comment_count || 0,
          title: stats.title,
          description: stats.description,
          visibility: stats.visibility,
          created: stats.created,
          modified: stats.modified,
        });
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Error fetching collection statistics";
        showNotification(errorMessage, "error");
      } finally {
        setIsLoadingStats(false);
      }
    }
  };

  const initiateDeleteCollection = (): void => {
    if (!selectedCollection || !collectionStats) {
      showNotification("Please select a collection first", "error");
      return;
    }
    setConfirmDialogOpen(true);
  };

  const handleCloseConfirmDialog = (): void => {
    setConfirmDialogOpen(false);
    setConfirmationText("");
  };

  const handleConfirmationTextChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ): void => {
    setConfirmationText(event.target.value);
  };

  const isConfirmationValid = (): boolean => {
    if (!collectionStats) return false;
    return confirmationText === collectionStats.title;
  };

  const handleDeleteCollection = async (): Promise<void> => {
    if (!selectedCollection || !collectionStats) return;

    setConfirmDialogOpen(false);
    setIsDeleting(true);
    setShowProgress(true);
    setDeleteProgress(0);

    try {
      setDeleteProgress(20);

      await api.delete(`/collections/${selectedCollection}?force=true`);

      setDeleteProgress(70);
      setDeleteProgress(90);

      // Refresh the collections list after successful deletion
      dispatch(fetchDocumentCollections({ includeUsers: true }));

      setSelectedCollection("");
      setCollectionStats(null);
      setConfirmationText("");

      setDeleteProgress(100);

      showNotification(
        `Collection "${collectionStats.title}" deleted successfully`,
        "success"
      );

      onSuccess();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "An unknown error occurred";
      showNotification(`Failed to delete collection: ${errorMessage}`, "error");
    } finally {
      setIsDeleting(false);
      setTimeout(() => {
        setShowProgress(false);
        setDeleteProgress(0);
      }, 1000);
    }
  };

  return (
    <>
      <Typography variant="h5" gutterBottom>
        Delete Document Collection
      </Typography>

      <div>
        <p>
          Select a document collection to delete. <strong>Warning:</strong>{" "}
          This will permanently delete all documents, content, and
          annotations in the collection.
        </p>
        <p style={{ color: "red", fontWeight: "bold" }}>
          ⚠️ This action cannot be undone!
        </p>
      </div>

      <StyledForm>
        <CollectionSelect
          id="delete-collection-select"
          value={selectedCollection}
          onChange={handleCollectionSelect}
          collections={collections}
          disabled={isDeleting}
        />
      </StyledForm>

      {isLoadingStats && (
        <Box sx={{ width: "100%", mt: 2 }}>
          <LinearProgress />
          <Typography variant="body2" sx={{ mt: 1 }}>
            Loading collection statistics...
          </Typography>
        </Box>
      )}

      {collectionStats && (
        <>
          <CollectionDetailsCard
            details={{
              title: collectionStats.title,
              description: collectionStats.description,
              visibility: collectionStats.visibility,
            }}
            variant="warning"
          >
            <Typography variant="body2">
              <strong>Created:</strong>{" "}
              {new Date(collectionStats.created).toLocaleDateString()}
            </Typography>
            <Typography variant="body2">
              <strong>Modified:</strong>{" "}
              {new Date(collectionStats.modified).toLocaleDateString()}
            </Typography>

            <Typography variant="h6" sx={{ mt: 2 }} gutterBottom>
              Content to be deleted:
            </Typography>
            <Typography variant="body2" sx={{ color: "error.main" }}>
              • {collectionStats.document_count} documents
            </Typography>
            <Typography variant="body2" sx={{ color: "error.main" }}>
              • {collectionStats.element_count} paragraphs
            </Typography>
            <Typography variant="body2" sx={{ color: "error.main" }}>
              • {collectionStats.scholarly_annotation_count} scholarly annotations
            </Typography>
            <Typography variant="body2" sx={{ color: "error.main" }}>
              • {collectionStats.comment_count} comments
            </Typography>
          </CollectionDetailsCard>
        </>
      )}

      {showProgress && (
        <Box sx={{ width: "100%", mt: 2 }}>
          <LinearProgress variant="determinate" value={deleteProgress} />
          <Typography variant="body2" sx={{ mt: 1 }}>
            Deleting collection... {deleteProgress}%
          </Typography>
        </Box>
      )}

      <Button
        variant="contained"
        color="error"
        onClick={initiateDeleteCollection}
        disabled={!selectedCollection || isDeleting || !collectionStats}
        sx={{ marginTop: 2 }}
      >
        {isDeleting ? "Deleting..." : "Delete Collection"}
      </Button>

      <DeleteConfirmationDialog
        open={confirmDialogOpen}
        collectionStats={collectionStats}
        confirmationText={confirmationText}
        onConfirmationTextChange={handleConfirmationTextChange}
        onConfirm={handleDeleteCollection}
        onCancel={handleCloseConfirmDialog}
        isConfirmationValid={isConfirmationValid()}
      />
    </>
  );
};

export default DeleteCollection;