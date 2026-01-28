// ManageDocuments/components/UpdateDescriptionTab/index.tsx

import React, { useState } from "react";
import {
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
} from "@mui/material";
import { useAppDispatch } from "@store/hooks";
import { updateDocument, fetchDocumentsByCollection } from "@store";
import { useCollectionDocumentSelection } from "../../hooks";
import { StyledForm } from "@admin/components/ManageCollections/shared";
import { DocumentCollection } from "@/store/slice/documentCollectionSlice";
import { NotificationState } from "../../types";

interface UpdateDescriptionTabProps {
  documentCollections: DocumentCollection[];
  showNotification: (
    message: string,
    severity: NotificationState["severity"]
  ) => void;
}

const UpdateDescriptionTab: React.FC<UpdateDescriptionTabProps> = ({
  documentCollections,
  showNotification,
}) => {
  const dispatch = useAppDispatch();

  // Local state for update description operation
  const [newDescription, setNewDescription] = useState<string>("");
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  // Use shared collection/document selection hook
  const {
    selectedCollectionId,
    selectedDocumentId,
    documents,
    isLoadingDocuments,
    handleCollectionChange,
    handleDocumentChange,
    getSelectedDocument,
  } = useCollectionDocumentSelection({
    onError: () => {
      showNotification(
        "Failed to load documents for selected collection",
        "error"
      );
    },
    onDocumentSelect: (document) => {
      // Pre-fill the description field with current document description
      setNewDescription(document?.description || "");
    },
  });

  const handleDescriptionChange = (
    event: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    setNewDescription(event.target.value);
  };

  const isFormValid = (): boolean => {
    return (
      !!selectedCollectionId &&
      !!selectedDocumentId &&
      newDescription.trim() !== undefined
    );
  };

  const handleUpdateDescription = async () => {
    if (!selectedDocumentId) {
      showNotification("Please select a document", "error");
      return;
    }

    const selectedDocument = getSelectedDocument();
    if (!selectedDocument) {
      showNotification("Selected document not found", "error");
      return;
    }

    // Check if description is different from current
    if (newDescription.trim() === selectedDocument.description) {
      showNotification(
        "Description must be different from current description",
        "error"
      );
      return;
    }

    setIsUpdating(true);

    try {
      await dispatch(
        updateDocument({
          id: parseInt(selectedDocumentId),
          updates: {
            description: newDescription.trim(),
          },
        })
      ).unwrap();

      // Refresh documents to show updated data
      if (selectedCollectionId) {
        await dispatch(
          fetchDocumentsByCollection(parseInt(selectedCollectionId))
        ).unwrap();
      }

      // Update the local description to reflect the change
      setNewDescription(newDescription.trim());

      showNotification("Document description updated successfully", "success");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      showNotification(
        `Failed to update document description: ${errorMessage}`,
        "error"
      );
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <>
      <Typography variant="h5" gutterBottom>
        Update Document Description
      </Typography>
      <div>
        <p>Select a document to update its description:</p>
      </div>
      <StyledForm>
        <FormControl fullWidth sx={{ maxWidth: "400px" }}>
          <InputLabel id="update-description-collection-select-label">
            Select a collection
          </InputLabel>
          <Select
            labelId="update-description-collection-select-label"
            id="update-description-collection-select"
            value={selectedCollectionId}
            label="Select a collection"
            onChange={(e) => handleCollectionChange(e.target.value as string)}
            name="update_description_collection_id"
            disabled={isUpdating}
          >
            <MenuItem value="">
              <em>Select a collection</em>
            </MenuItem>
            {documentCollections.map((collection) => (
              <MenuItem key={collection.id} value={collection.id.toString()}>
                {collection.title}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth sx={{ maxWidth: "400px" }}>
          <InputLabel id="update-description-document-select-label">
            Document
          </InputLabel>
          <Select
            labelId="update-description-document-select-label"
            id="update-description-document-select"
            value={selectedDocumentId}
            label="Document"
            onChange={(e) => handleDocumentChange(e.target.value as string)}
            name="update_description_document_id"
            disabled={!selectedCollectionId || isUpdating || isLoadingDocuments}
          >
            <MenuItem value="">
              <em>
                {isLoadingDocuments
                  ? "Loading documents..."
                  : "Select a document"}
              </em>
            </MenuItem>
            {documents.map((document) => (
              <MenuItem key={document.id} value={document.id.toString()}>
                {document.title}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <div className="form-group">
          <label htmlFor="update-description-new-description">
            Description:{" "}
          </label>
          <textarea
            id="update-description-new-description"
            name="update_description_new_description"
            value={newDescription}
            onChange={handleDescriptionChange}
            disabled={isUpdating}
            maxLength={1000}
            placeholder="Enter document description"
            rows={4}
            style={{
              width: "100%",
              maxWidth: "600px",
              padding: "8px",
              borderRadius: "4px",
              border: "1px solid #ccc",
              resize: "vertical",
              fontFamily: "inherit",
            }}
          />
        </div>

        <Button
          variant="contained"
          onClick={handleUpdateDescription}
          disabled={isUpdating || !isFormValid()}
          sx={{ marginTop: 2 }}
        >
          {isUpdating ? "Updating..." : "Update Description"}
        </Button>
      </StyledForm>
    </>
  );
};

export { UpdateDescriptionTab };