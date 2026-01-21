// ManageDocuments/components/RenameDocumentTab/index.tsx

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

interface RenameDocumentTabProps {
  documentCollections: DocumentCollection[];
  showNotification: (
    message: string,
    severity: NotificationState["severity"]
  ) => void;
}

const RenameDocumentTab: React.FC<RenameDocumentTabProps> = ({
  documentCollections,
  showNotification,
}) => {
  const dispatch = useAppDispatch();

  // Local state for rename operation
  const [renameNewName, setRenameNewName] = useState<string>("");
  const [isRenaming, setIsRenaming] = useState<boolean>(false);

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
      // Pre-fill the new name field with current document title
      setRenameNewName(document?.title || "");
    },
  });

  const handleNewNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRenameNewName(event.target.value);
  };

  const isFormValid = (): boolean => {
    return (
      !!selectedCollectionId &&
      !!selectedDocumentId &&
      !!renameNewName.trim() &&
      renameNewName.trim().length > 0
    );
  };

  const handleRenameDocument = async () => {
    if (!selectedDocumentId || !renameNewName.trim()) {
      showNotification(
        "Please select a document and enter a new name",
        "error"
      );
      return;
    }

    const selectedDocument = getSelectedDocument();
    if (!selectedDocument) {
      showNotification("Selected document not found", "error");
      return;
    }

    // Check if name is different from current
    if (renameNewName.trim() === selectedDocument.title) {
      showNotification(
        "New name must be different from current name",
        "error"
      );
      return;
    }

    // Check if name already exists in the same collection
    const nameExists = documents.some(
      (d) =>
        d.title.toLowerCase() === renameNewName.trim().toLowerCase() &&
        d.id !== parseInt(selectedDocumentId)
    );

    if (nameExists) {
      showNotification(
        "A document with this name already exists in this collection",
        "error"
      );
      return;
    }

    setIsRenaming(true);

    try {
      await dispatch(
        updateDocument({
          id: parseInt(selectedDocumentId),
          updates: {
            title: renameNewName.trim(),
          },
        })
      ).unwrap();

      // Refresh documents to show updated data
      if (selectedCollectionId) {
        await dispatch(
          fetchDocumentsByCollection(parseInt(selectedCollectionId))
        ).unwrap();
      }

      showNotification(
        `Document renamed from "${selectedDocument.title}" to "${renameNewName.trim()}"`,
        "success"
      );

      // Reset document selection and name field
      handleDocumentChange("");
      setRenameNewName("");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      showNotification(`Failed to rename document: ${errorMessage}`, "error");
    } finally {
      setIsRenaming(false);
    }
  };

  return (
    <>
      <Typography variant="h5" gutterBottom>
        Rename Document
      </Typography>
      <div>
        <p>Select a document to rename:</p>
      </div>
      <StyledForm>
        <FormControl fullWidth sx={{ maxWidth: "400px" }}>
          <InputLabel id="rename-collection-select-label">
            Select a collection
          </InputLabel>
          <Select
            labelId="rename-collection-select-label"
            id="rename-collection-select"
            value={selectedCollectionId}
            label="Select a collection"
            onChange={(e) => handleCollectionChange(e.target.value as string)}
            name="rename_collection_id"
            disabled={isRenaming}
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
          <InputLabel id="rename-document-select-label">Document</InputLabel>
          <Select
            labelId="rename-document-select-label"
            id="rename-document-select"
            value={selectedDocumentId}
            label="Document"
            onChange={(e) => handleDocumentChange(e.target.value as string)}
            name="rename_document_id"
            disabled={!selectedCollectionId || isRenaming || isLoadingDocuments}
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
          <label htmlFor="rename-new-name">New Name: </label>
          <input
            type="text"
            id="rename-new-name"
            name="rename_new_name"
            value={renameNewName}
            onChange={handleNewNameChange}
            disabled={isRenaming}
            maxLength={200}
            placeholder="Enter new document name"
            required
          />
        </div>

        <Button
          variant="contained"
          onClick={handleRenameDocument}
          disabled={isRenaming || !isFormValid()}
          sx={{ marginTop: 2 }}
        >
          {isRenaming ? "Renaming..." : "Rename Document"}
        </Button>
      </StyledForm>
    </>
  );
};

export { RenameDocumentTab };