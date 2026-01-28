// ManageDocuments/components/DeleteDocumentsTab/index.tsx

import React, { useState } from "react";
import {
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import axios, { AxiosInstance } from "axios";
import { useDocumentsWithStats } from "../../hooks";
import { StyledForm } from "@admin/components/ManageCollections/shared";
import { DocumentCollection } from "@/store/slice/documentCollectionSlice";
import { NotificationState, DocumentToDelete } from "../../types";
import { DeleteConfirmationRequest } from "../../index";

const api: AxiosInstance = axios.create({
  baseURL: "/api/v1",
  timeout: 120000,
});

interface DeleteDocumentsTabProps {
  documentCollections: DocumentCollection[];
  showNotification: (
    message: string,
    severity: NotificationState["severity"]
  ) => void;
  requestDeleteConfirmation: (request: DeleteConfirmationRequest) => void;
}

const DeleteDocumentsTab: React.FC<DeleteDocumentsTabProps> = ({
  documentCollections,
  showNotification,
  requestDeleteConfirmation,
}) => {
  // Local state for selection and deletion
  const [selectedDocuments, setSelectedDocuments] = useState<number[]>([]);
  const [deleteAllInCollection, setDeleteAllInCollection] =
    useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Use the documents with stats hook
  const {
    selectedCollectionId,
    documentsWithStats,
    isLoading,
    handleCollectionChange,
    refreshDocuments,
  } = useDocumentsWithStats({
    onError: (error) => {
      const axiosError = error as {
        response?: { data?: { detail?: string } };
        message?: string;
      };
      const errorMessage =
        axiosError.response?.data?.detail ||
        axiosError.message ||
        "Error fetching document statistics";
      showNotification(errorMessage, "error");
    },
  });

  // Handle collection selection
  const handleCollectionSelect = async (
    event: React.ChangeEvent<{ value: unknown }>
  ) => {
    const collectionId = event.target.value as string;

    // Reset local state
    setSelectedDocuments([]);
    setDeleteAllInCollection(false);

    await handleCollectionChange(collectionId);
  };

  // Handle individual document checkbox change
  const handleDocumentCheckboxChange = (documentId: number) => {
    setSelectedDocuments((prev) => {
      if (prev.includes(documentId)) {
        return prev.filter((id) => id !== documentId);
      } else {
        return [...prev, documentId];
      }
    });
    // If individual documents are selected, uncheck "delete all"
    setDeleteAllInCollection(false);
  };

  // Handle "delete all" checkbox change
  const handleDeleteAllChange = (checked: boolean) => {
    setDeleteAllInCollection(checked);
    if (checked) {
      // If "delete all" is checked, clear individual selections
      setSelectedDocuments([]);
    }
  };

  // Build annotation suffix for display
  const getAnnotationSuffix = (document: {
    scholarly_annotation_count: number;
    comment_count: number;
  }): string => {
    const annotationText: string[] = [];

    if (document.scholarly_annotation_count > 0) {
      annotationText.push(
        `${document.scholarly_annotation_count} scholarly annotation${
          document.scholarly_annotation_count !== 1 ? "s" : ""
        }`
      );
    }

    if (document.comment_count > 0) {
      annotationText.push(
        `${document.comment_count} comment${
          document.comment_count !== 1 ? "s" : ""
        }`
      );
    }

    return annotationText.length > 0 ? ` (${annotationText.join(", ")})` : "";
  };

  // Initiate delete - opens confirmation dialog
  const initiateDelete = () => {
    if (!selectedCollectionId) {
      showNotification("Please select a collection first", "error");
      return;
    }

    let documentsToDelete: DocumentToDelete[] = [];
    let message = "";

    if (deleteAllInCollection) {
      documentsToDelete = documentsWithStats.map((doc) => ({
        id: doc.id,
        title: doc.title,
        scholarly_annotation_count: doc.scholarly_annotation_count,
        comment_count: doc.comment_count,
        element_count: doc.element_count,
      }));
      message = `Are you sure you want to delete ALL ${documentsToDelete.length} documents in this collection? This action cannot be undone.`;
    } else if (selectedDocuments.length > 0) {
      documentsToDelete = documentsWithStats
        .filter((doc) => selectedDocuments.includes(doc.id))
        .map((doc) => ({
          id: doc.id,
          title: doc.title,
          scholarly_annotation_count: doc.scholarly_annotation_count,
          comment_count: doc.comment_count,
          element_count: doc.element_count,
        }));
      message = `Are you sure you want to delete ${documentsToDelete.length} selected document(s)? This action cannot be undone.`;
    } else {
      showNotification(
        'Please select documents to delete or choose "Delete All"',
        "error"
      );
      return;
    }

    requestDeleteConfirmation({
      title: "Confirm Document Deletion",
      message,
      documentsToDelete,
      onConfirm: handleConfirmDelete,
    });
  };

  // Handle confirmed delete
  const handleConfirmDelete = async () => {
    setIsDeleting(true);

    try {
      const collectionId = parseInt(selectedCollectionId);

      if (deleteAllInCollection) {
        // Delete all documents in collection
        await api.delete(`/collections/${collectionId}/documents`);
      } else {
        // Delete selected documents
        await api.delete("/documents/bulk-delete", {
          data: { document_ids: selectedDocuments },
        });
      }

      // Refresh the documents list after successful deletion
      await refreshDocuments();

      // Reset selection state
      setSelectedDocuments([]);
      setDeleteAllInCollection(false);

      showNotification("Documents deleted successfully", "success");
    } catch (error) {
      const axiosError = error as {
        response?: { data?: { detail?: string } };
        message?: string;
      };
      const errorMessage =
        axiosError.response?.data?.detail ||
        axiosError.message ||
        "An unknown error occurred";
      showNotification(`Failed to delete documents: ${errorMessage}`, "error");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Typography variant="h5" gutterBottom>
        Delete Documents
      </Typography>
      <div>
        <p>Select a collection and then choose documents to delete:</p>
        <StyledForm>
          <FormControl fullWidth sx={{ maxWidth: "400px" }}>
            <InputLabel id="delete-collection-label">
              Select a collection
            </InputLabel>
            <Select
              labelId="delete-collection-label"
              id="delete-collection-select"
              value={selectedCollectionId}
              label="Select a collection"
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onChange={handleCollectionSelect as any}
              disabled={isDeleting}
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

          {isLoading && (
            <Typography variant="body2" color="text.secondary">
              Loading documents...
            </Typography>
          )}

          {selectedCollectionId && !isLoading && documentsWithStats.length > 0 && (
            <div style={{ marginTop: "20px" }}>
              <Typography variant="h6" gutterBottom>
                Documents in Collection:
              </Typography>

              <FormControlLabel
                control={
                  <Checkbox
                    checked={deleteAllInCollection}
                    onChange={(e) => handleDeleteAllChange(e.target.checked)}
                    color="error"
                    disabled={isDeleting}
                  />
                }
                label={`Delete ALL documents in this collection (${documentsWithStats.length} total)`}
                sx={{
                  marginBottom: 2,
                  "& .MuiFormControlLabel-label": {
                    fontWeight: "bold",
                    color: "error.main",
                  },
                }}
              />

              {!deleteAllInCollection && (
                <div
                  style={{
                    maxHeight: "300px",
                    overflowY: "auto",
                    border: "1px solid #ddd",
                    padding: "10px",
                    borderRadius: "4px",
                  }}
                >
                  {documentsWithStats.map((document) => {
                    const annotationSuffix = getAnnotationSuffix(document);

                    return (
                      <FormControlLabel
                        key={document.id}
                        control={
                          <Checkbox
                            checked={selectedDocuments.includes(document.id)}
                            onChange={() =>
                              handleDocumentCheckboxChange(document.id)
                            }
                            disabled={isDeleting}
                          />
                        }
                        label={`${
                          document.title || `Document ${document.id}`
                        }${annotationSuffix}`}
                        sx={{ display: "block", marginBottom: 1 }}
                      />
                    );
                  })}
                </div>
              )}

              <Button
                variant="contained"
                color="error"
                onClick={initiateDelete}
                disabled={
                  isDeleting ||
                  (!deleteAllInCollection && selectedDocuments.length === 0)
                }
                sx={{ marginTop: 2 }}
              >
                {isDeleting ? "Deleting..." : "Delete Selected Documents"}
              </Button>
            </div>
          )}

          {selectedCollectionId &&
            !isLoading &&
            documentsWithStats.length === 0 && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ marginTop: 2 }}
              >
                No documents found in this collection.
              </Typography>
            )}
        </StyledForm>
      </div>
    </>
  );
};

export { DeleteDocumentsTab };