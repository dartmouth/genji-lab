// ManageDocuments/components/ImportWordTab/index.tsx

import React, { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Box,
} from "@mui/material";
import axios, { AxiosInstance } from "axios";
import { useAppSelector } from "@store/hooks";
import { selectAllDocuments } from "@store";
import { useAuth } from "@hooks/useAuthContext";
import { StyledForm } from "@admin/components/ManageCollections/shared";
import { DocumentCollection } from "@/store/slice/documentCollectionSlice";
import {
  NotificationState,
  ImportWordFormData,
  ImportedDocumentData,
} from "../../types";

const api: AxiosInstance = axios.create({
  baseURL: "/api/v1",
  timeout: 120000, // 2 minutes timeout for Word document processing
});

interface ImportWordTabProps {
  documentCollections: DocumentCollection[];
  showNotification: (
    message: string,
    severity: NotificationState["severity"]
  ) => void;
}

const ImportWordTab: React.FC<ImportWordTabProps> = ({
  documentCollections,
  showNotification,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const documents = useAppSelector(selectAllDocuments);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [formData, setFormData] = useState<ImportWordFormData>({
    document_collection_id: undefined,
    title: "",
    description: "",
    file: null,
  });
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>("");

  // UI state
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [titleError, setTitleError] = useState<string>("");
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [importedDocumentData, setImportedDocumentData] =
    useState<ImportedDocumentData | null>(null);

  // Validate title for duplicates within collection
  const validateTitleInCollection = useCallback(
    (title: string, collectionId: number | undefined) => {
      if (!title.trim() || !collectionId) {
        setTitleError("");
        return;
      }

      const documentsInCollection = documents.filter(
        (doc) => doc.document_collection_id === collectionId
      );

      const nameExists = documentsInCollection.some(
        (doc) => doc.title.toLowerCase() === title.trim().toLowerCase()
      );

      if (nameExists) {
        setTitleError(
          "A document with this title already exists in the selected collection"
        );
      } else {
        setTitleError("");
      }
    },
    [documents]
  );

  // Handle collection selection
  const handleCollectionChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    const collectionId = parseInt(event.target.value as string) || undefined;

    setSelectedCollectionId(event.target.value as string);
    setFormData((prev) => ({
      ...prev,
      document_collection_id: collectionId,
    }));

    // Clear previous error and revalidate with current title
    setTitleError("");
    if (formData.title.trim() && collectionId) {
      validateTitleInCollection(formData.title, collectionId);
    }
  };

  // Handle title change with debounced validation
  const handleTitleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = event.target.value;

    setFormData((prev) => ({
      ...prev,
      title: newTitle,
    }));

    // Clear previous error immediately
    setTitleError("");

    // Debounce validation check
    if (newTitle.trim() && formData.document_collection_id) {
      setTimeout(() => {
        // Only validate if the value hasn't changed since this timeout was set
        setFormData((currentData) => {
          if (
            currentData.title === newTitle &&
            newTitle.trim() &&
            currentData.document_collection_id
          ) {
            validateTitleInCollection(newTitle, currentData.document_collection_id);
          }
          return currentData;
        });
      }, 300); // 300ms debounce
    }
  };

  // Handle description change
  const handleDescriptionChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      description: event.target.value,
    }));
  };

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setFormData((prev) => ({
      ...prev,
      file: file,
    }));
  };

  // Reset form to initial state
  const resetForm = () => {
    setFormData({
      document_collection_id: undefined,
      title: "",
      description: "",
      file: null,
    });
    setSelectedCollectionId("");
    setError("");
    setTitleError("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent double submission
    if (isLoading) {
      return;
    }

    setError("");

    // Check for real-time validation error
    if (titleError) {
      setError(titleError);
      return;
    }

    // Validate required fields
    if (
      !formData.document_collection_id ||
      !formData.title.trim() ||
      !formData.file
    ) {
      setError("Please select a collection, enter a title, and select a file");
      return;
    }

    // Validate file type
    if (!formData.file.name.endsWith(".docx")) {
      setError("Please select a .docx file");
      return;
    }

    // Check for duplicate document name within the same collection
    const documentsInCollection = documents.filter(
      (d) => d.document_collection_id === formData.document_collection_id
    );

    const nameExists = documentsInCollection.some(
      (d) => d.title.toLowerCase() === formData.title.trim().toLowerCase()
    );

    if (nameExists) {
      setError("Document name already exists in this collection");
      return;
    }

    setIsLoading(true);

    // Store submitted data and clear form immediately to prevent re-submission
    const submittedData = { ...formData };
    resetForm();

    try {
      const apiFormData = new FormData();
      apiFormData.append("file", submittedData.file!);

      const selectedCollection = documentCollections.find(
        (c) => c.id === submittedData.document_collection_id
      );

      const response = await api.post(
        `/documents/import-word-doc?document_collection_id=${
          submittedData.document_collection_id
        }&title=${encodeURIComponent(
          submittedData.title
        )}&description=${encodeURIComponent(submittedData.description)}`,
        apiFormData
      );

      const result = response.data;

      // Store the imported document data for display
      setImportedDocumentData({
        id: result.document.id,
        title: result.document.title,
        collection_id: submittedData.document_collection_id!,
        collection_name: selectedCollection?.title || "Unknown Collection",
        elements_created: result.import_results.elements_created,
      });

      setIsSubmitted(true);
      showNotification(
        `Document "${submittedData.title}" created and imported successfully! Created ${result.import_results.elements_created} paragraphs.`,
        "success"
      );
    } catch (error: unknown) {
      // If import fails, restore the form data so user doesn't lose their work
      setFormData(submittedData);
      setSelectedCollectionId(
        submittedData.document_collection_id?.toString() || ""
      );

      const axiosError = error as { response?: { data?: { detail?: string } }; message?: string };
      setError(
        `Import failed: ${
          axiosError.response?.data?.detail || axiosError.message || "Unknown error"
        }`
      );
    } finally {
      // Add a minimum delay to prevent rapid re-submission
      setTimeout(() => {
        setIsLoading(false);
      }, 1000);
    }
  };

  // Navigate to the imported document
  const handleViewDocument = () => {
    if (importedDocumentData) {
      navigate(
        `/collections/${importedDocumentData.collection_id}/documents/${importedDocumentData.id}`
      );
    }
  };

  // Reset to import another document
  const handleImportAnother = () => {
    setIsSubmitted(false);
    setImportedDocumentData(null);
    setError("");
    resetForm();
  };

  // Form validation
  const isFormValid = (): boolean => {
    return (
      !!formData.document_collection_id &&
      !!formData.title.trim() &&
      !!formData.file &&
      !titleError
    );
  };

  // Render success state
  if (isSubmitted && importedDocumentData) {
    return (
      <>
        <Typography variant="h5" gutterBottom>
          Import Word Document
        </Typography>
        <div className="submitted-data">
          <h2>Word document imported successfully!</h2>
          <p>
            <strong>Document ID:</strong> {importedDocumentData.id}
          </p>
          <p>
            <strong>Title:</strong> {importedDocumentData.title}
          </p>
          <p>
            <strong>Collection:</strong> {importedDocumentData.collection_name}
          </p>
          <p>
            <strong>Paragraphs Created:</strong>{" "}
            {importedDocumentData.elements_created}
          </p>
          <p>
            <strong>User:</strong> {user?.first_name} {user?.last_name}
          </p>

          <Box sx={{ mt: 2, display: "flex", gap: 2 }}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleViewDocument}
              sx={{
                backgroundColor: "success.main",
                "&:hover": {
                  backgroundColor: "success.dark",
                },
                fontWeight: "bold",
              }}
            >
              📄 View Document
            </Button>
            <Button variant="outlined" onClick={handleImportAnother}>
              Import Another Document
            </Button>
          </Box>
        </div>
      </>
    );
  }

  // Render form
  return (
    <>
      <Typography variant="h5" gutterBottom>
        Import Word Document
      </Typography>
      <div>
        <p>Create a new document and import Word document (.docx) content.</p>
      </div>
      <StyledForm onSubmit={handleSubmit}>
        <FormControl fullWidth sx={{ maxWidth: "400px" }}>
          <InputLabel id="import-word-collection-select-label">
            Select a collection
          </InputLabel>
          <Select
            labelId="import-word-collection-select-label"
            id="import-word-collection-select"
            value={selectedCollectionId}
            label="Select a collection"
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onChange={handleCollectionChange as any}
            name="document_collection_id"
            disabled={isLoading}
            required
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

        <div className="form-group">
          <label htmlFor="import-word-title">Document Title: </label>
          <input
            type="text"
            id="import-word-title"
            name="title"
            value={formData.title}
            onChange={handleTitleChange}
            disabled={isLoading}
            required
            placeholder="Enter document title"
            maxLength={200}
            style={{
              borderColor: titleError ? "red" : undefined,
              opacity: isLoading ? 0.6 : 1,
            }}
          />
          {titleError && (
            <div style={{ color: "red", fontSize: "14px", marginTop: "4px" }}>
              {titleError}
            </div>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="import-word-description">
            Description (optional):{" "}
          </label>
          <input
            type="text"
            id="import-word-description"
            name="description"
            value={formData.description}
            onChange={handleDescriptionChange}
            disabled={isLoading}
            placeholder="Enter document description"
            maxLength={1000}
            style={{ opacity: isLoading ? 0.6 : 1 }}
          />
        </div>

        <div className="form-group">
          <label htmlFor="import-word-file">Word Document (.docx): </label>
          <input
            type="file"
            id="import-word-file"
            name="file"
            accept=".docx"
            onChange={handleFileSelect}
            disabled={isLoading}
            required
            ref={fileInputRef}
            style={{ opacity: isLoading ? 0.6 : 1 }}
          />
        </div>

        {error && (
          <div style={{ color: "red", marginBottom: "16px" }}>{error}</div>
        )}

        <button type="submit" disabled={isLoading || !isFormValid()}>
          {isLoading ? "Importing..." : "Import Word Document"}
        </button>
      </StyledForm>
    </>
  );
};

export { ImportWordTab };