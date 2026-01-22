// ManageDocuments/components/DeleteContentTab/index.tsx

import React, { useState, useMemo } from "react";
import {
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
} from "@mui/material";
import axios, { AxiosInstance } from "axios";
import { useAppSelector } from "@store/hooks";
import { selectAllDocuments } from "@store";
import { StyledForm } from "@admin/components/ManageCollections/shared";
import { DocumentCollection } from "@/store/slice/documentCollectionSlice";
import { NotificationState, DocumentContentStats } from "../../types";
import { DeleteConfirmationRequest } from "../../index";

const api: AxiosInstance = axios.create({
  baseURL: "/api/v1",
  timeout: 120000,
});

interface DeleteContentTabProps {
  documentCollections: DocumentCollection[];
  showNotification: (
    message: string,
    severity: NotificationState["severity"]
  ) => void;
  requestDeleteConfirmation: (request: DeleteConfirmationRequest) => void;
}

const DeleteContentTab: React.FC<DeleteContentTabProps> = ({
  documentCollections,
  showNotification,
  requestDeleteConfirmation,
}) => {
  // Get all documents from Redux
  const documents = useAppSelector(selectAllDocuments);

  // Local state
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>("");
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>("");
  const [contentStats, setContentStats] = useState<DocumentContentStats | null>(
    null
  );
  const [isLoadingStats, setIsLoadingStats] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Memoized documents filtered by selected collection
  const documentsInSelectedCollection = useMemo(() => {
    if (!selectedCollectionId) return [];
    return documents.filter(
      (doc) => doc.document_collection_id === parseInt(selectedCollectionId)
    );
  }, [selectedCollectionId, documents]);

  // Handle collection selection
  const handleCollectionChange = (
    event: React.ChangeEvent<{ value: unknown }>
  ) => {
    const collectionId = event.target.value as string;
    setSelectedCollectionId(collectionId);
    setSelectedDocumentId("");
    setContentStats(null);
  };

  // Handle document selection and fetch stats
  const handleDocumentChange = async (
    event: React.ChangeEvent<{ value: unknown }>
  ) => {
    const documentId = event.target.value as string;
    setSelectedDocumentId(documentId);
    setContentStats(null);

    if (!documentId) {
      return;
    }

    setIsLoadingStats(true);

    try {
      const response = await api.get(
        `/elements/document/${documentId}/stats`
      );
      const stats = response.data;
      setContentStats({
        element_count: stats.element_count,
        annotation_count: stats.annotation_count,
      });
    } catch (error) {
      const axiosError = error as {
        response?: { data?: { detail?: string } };
        message?: string;
      };
      const errorMessage =
        axiosError.response?.data?.detail ||
        axiosError.message ||
        "Failed to fetch document statistics";
      showNotification(errorMessage, "error");
    } finally {
      setIsLoadingStats(false);
    }
  };

  // Initiate delete - opens confirmation dialog
  const initiateContentDelete = () => {
    if (!selectedDocumentId || !contentStats) {
      showNotification("Please select a document first", "error");
      return;
    }

    const selectedDoc = documents.find(
      (d) => d.id === parseInt(selectedDocumentId)
    );
    const selectedCollection = documentCollections.find(
      (c) => c.id === parseInt(selectedCollectionId)
    );

    if (!selectedDoc || !selectedCollection) {
      showNotification("Invalid document or collection selection", "error");
      return;
    }

    const message = `Are you sure you want to delete ALL CONTENT from "${selectedDoc.title}" in collection "${selectedCollection.title}"?

This will permanently delete:
• ${contentStats.element_count} paragraphs
• ${contentStats.annotation_count} annotations

The document itself will remain but will be empty. This action cannot be undone.`;

    requestDeleteConfirmation({
      title: "Confirm Document Content Deletion",
      message,
      documentsToDelete: [
        {
          id: selectedDoc.id,
          title: selectedDoc.title,
          element_count: contentStats.element_count,
          scholarly_annotation_count: contentStats.annotation_count,
          comment_count: 0,
        },
      ],
      onConfirm: handleConfirmContentDelete,
    });
  };

  // Handle confirmed delete
  const handleConfirmContentDelete = async () => {
    if (!selectedDocumentId) return;

    setIsDeleting(true);

    try {
      const documentId = parseInt(selectedDocumentId);
      await api.delete(`/elements/document/${documentId}/all-elements?force=true`);

      const selectedDoc = documents.find((d) => d.id === documentId);
      const selectedCollection = documentCollections.find(
        (c) => c.id === parseInt(selectedCollectionId)
      );

      // Reset form
      setSelectedDocumentId("");
      setContentStats(null);

      showNotification(
        `Successfully deleted all content from document '${selectedDoc?.title}' in collection '${selectedCollection?.title}'`,
        "success"
      );
    } catch (error) {
      const axiosError = error as {
        response?: { data?: { detail?: string } };
        message?: string;
      };
      const errorMessage =
        axiosError.response?.data?.detail ||
        axiosError.message ||
        "An unknown error occurred";
      showNotification(
        `Failed to delete document content: ${errorMessage}`,
        "error"
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Typography variant="h5" gutterBottom>
        Delete Document Content
      </Typography>
      <div>
        <p>
          Select a document to delete all of its content. The document itself
          will remain but all content and annotations will be permanently
          deleted.
        </p>
        <p style={{ color: "red", fontWeight: "bold" }}>
          ⚠️ Warning: This action cannot be undone!
        </p>
      </div>
      <StyledForm>
        <FormControl fullWidth sx={{ maxWidth: "400px" }}>
          <InputLabel id="content-delete-collection-select-label">
            Select a collection
          </InputLabel>
          <Select
            labelId="content-delete-collection-select-label"
            id="content-delete-collection-select"
            value={selectedCollectionId}
            label="Select a collection"
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onChange={handleCollectionChange as any}
            name="content_delete_collection_id"
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

        {selectedCollectionId && (
          <FormControl fullWidth sx={{ maxWidth: "400px" }}>
            <InputLabel id="content-delete-document-select-label">
              Document
            </InputLabel>
            <Select
              labelId="content-delete-document-select-label"
              id="content-delete-document-select"
              value={selectedDocumentId}
              label="Document"
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onChange={handleDocumentChange as any}
              name="content_delete_document_id"
              disabled={isDeleting}
            >
              <MenuItem value="">
                <em>Select a document</em>
              </MenuItem>
              {documentsInSelectedCollection.map((document) => (
                <MenuItem key={document.id} value={document.id.toString()}>
                  {document.title}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        {isLoadingStats && (
          <Typography variant="body2" color="text.secondary">
            Loading document statistics...
          </Typography>
        )}

        {contentStats && (
          <div
            style={{
              marginTop: "16px",
              padding: "16px",
              backgroundColor: "#fff3cd",
              border: "1px solid #ffeaa7",
              borderRadius: "4px",
            }}
          >
            <Typography variant="h6" gutterBottom>
              Content to be deleted:
            </Typography>
            <Typography variant="body2">
              • {contentStats.element_count} paragraphs
            </Typography>
            <Typography variant="body2">
              • {contentStats.annotation_count} annotations
            </Typography>
          </div>
        )}

        <Box sx={{ mt: 2 }}>
          <button
            type="button"
            onClick={initiateContentDelete}
            disabled={!selectedDocumentId || !contentStats || isDeleting}
            className="delete-button"
          >
            {isDeleting ? "Deleting Content..." : "Delete Document Content"}
          </button>
        </Box>

        {selectedCollectionId && documentsInSelectedCollection.length === 0 && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ marginTop: 2 }}
          >
            No documents found in this collection.
          </Typography>
        )}
      </StyledForm>
    </>
  );
};

export { DeleteContentTab };