// components/RenameCollection/index.tsx

import React, { useState } from "react";
import { Typography, TextField, Button, SelectChangeEvent } from "@mui/material";

import { useAuth } from "@hooks/useAuthContext";
import {
  updateDocumentCollection,
  fetchDocumentCollections,
  useAppDispatch,
} from "@store";

import { CollectionSelect } from "../../shared/CollectionSelect";
import { StyledForm } from "../../shared/StyledForm";
import { DocumentCollection, NotificationState } from "../../types";

export interface RenameCollectionProps {
  /** List of available collections */
  collections: DocumentCollection[];
  /** Callback when rename succeeds */
  onSuccess: () => void;
  /** Function to show notifications */
  showNotification: (
    message: string,
    severity: NotificationState["severity"]
  ) => void;
}

export const RenameCollection: React.FC<RenameCollectionProps> = ({
  collections,
  onSuccess,
  showNotification,
}) => {
  const dispatch = useAppDispatch();
  const { user } = useAuth();

  const [selectedCollection, setSelectedCollection] = useState<string>("");
  const [newName, setNewName] = useState<string>("");
  const [isRenaming, setIsRenaming] = useState<boolean>(false);

  const handleCollectionSelect = (event: SelectChangeEvent<string>) => {
    const collectionId = event.target.value;
    setSelectedCollection(collectionId);

    // Pre-fill the new name field with current collection title
    if (collectionId) {
      const selected = collections.find(
        (c) => c.id === parseInt(collectionId)
      );
      setNewName(selected?.title || "");
    } else {
      setNewName("");
    }
  };

  const handleNewNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setNewName(event.target.value);
  };

  const isFormValid = (): boolean => {
    return (
      selectedCollection !== "" &&
      newName.trim().length > 0
    );
  };

  const handleRenameCollection = async () => {
    if (!selectedCollection || !newName.trim()) {
      showNotification(
        "Please select a collection and enter a new name",
        "error"
      );
      return;
    }

    const selected = collections.find(
      (c) => c.id === parseInt(selectedCollection)
    );

    if (!selected) {
      showNotification("Selected collection not found", "error");
      return;
    }

    if (newName.trim() === selected.title) {
      showNotification(
        "New name must be different from current name",
        "error"
      );
      return;
    }

    // Check if name already exists (case-insensitive)
    const nameExists = collections.some(
      (c) =>
        c.title.toLowerCase() === newName.trim().toLowerCase() &&
        c.id !== parseInt(selectedCollection)
    );

    if (nameExists) {
      showNotification(
        "A collection with this name already exists",
        "error"
      );
      return;
    }

    setIsRenaming(true);

    try {
      await dispatch(
        updateDocumentCollection({
          id: parseInt(selectedCollection),
          updates: {
            title: newName.trim(),
            modified_by_id: user?.id || 1,
          },
        })
      ).unwrap();

      // Refresh collections to show updated data
      dispatch(fetchDocumentCollections({ includeUsers: true }));

      showNotification(
        `Collection renamed from "${selected.title}" to "${newName.trim()}"`,
        "success"
      );

      // Reset form
      setSelectedCollection("");
      setNewName("");

      // Notify parent of success
      onSuccess();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      showNotification(
        `Failed to rename collection: ${errorMessage}`,
        "error"
      );
    } finally {
      setIsRenaming(false);
    }
  };

  return (
    <>
      <Typography variant="h5" gutterBottom>
        Rename Document Collection
      </Typography>

      <p>Select a document collection to rename:</p>

      <StyledForm>
        <CollectionSelect
          id="rename-collection-select"
          value={selectedCollection}
          onChange={handleCollectionSelect}
          collections={collections}
          disabled={isRenaming}
        />

        <TextField
          id="new-name"
          label="New Name"
          placeholder="Enter new collection name"
          value={newName}
          onChange={handleNewNameChange}
          disabled={isRenaming}
          inputProps={{ maxLength: 200 }}
          fullWidth
          sx={{ maxWidth: "400px", mt: 2 }}
        />

        <Button
          variant="contained"
          color="primary"
          onClick={handleRenameCollection}
          disabled={!isFormValid() || isRenaming}
          sx={{ marginTop: 2 }}
        >
          {isRenaming ? "Renaming..." : "Rename Collection"}
        </Button>
      </StyledForm>
    </>
  );
};

export default RenameCollection;