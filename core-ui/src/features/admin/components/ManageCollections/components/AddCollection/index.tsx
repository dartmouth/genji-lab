// components/AddCollection/index.tsx

import React, { useState } from "react";
import { Typography } from "@mui/material";

import { useAuth } from "@hooks/useAuthContext";
import {
  createDocumentCollection,
  fetchDocumentCollections,
  useAppDispatch,
} from "@store";

import { StyledForm } from "../../shared/StyledForm";
import {
  useCollectionMetadata,
  CollectionMetadataForm,
} from "../../../CollectionMetadataForm";
import {
  DocumentCollection,
  NotificationState,
  CreateCollectionFormData,
} from "../../types";

export interface AddCollectionProps {
  collections: DocumentCollection[];
  onSuccess: () => void;
  showNotification: (
    message: string,
    severity: NotificationState["severity"]
  ) => void;
}

export const AddCollection: React.FC<AddCollectionProps> = ({
  collections,
  onSuccess,
  showNotification,
}) => {
  const dispatch = useAppDispatch();
  const { user } = useAuth();

  const [formData, setFormData] = useState<CreateCollectionFormData>({
    title: "",
    visibility: "public",
    text_direction: "ltr",
    language: "en",
  });
  const [submitted, setSubmitted] = useState(false);
  const [titleError, setTitleError] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const {
    metadataValues,
    setMetadataValues,
    metadataErrors,
    setMetadataErrors,
    validateMetadata,
    resetMetadata,
  } = useCollectionMetadata();

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ): void => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const newTitle = e.target.value;

    setFormData((prevData) => ({
      ...prevData,
      title: newTitle,
    }));

    setTitleError("");

    if (newTitle.trim()) {
      setTimeout(() => {
        setFormData((currentData) => {
          if (currentData.title === newTitle && newTitle.trim()) {
            const nameExists = collections.some(
              (c) => c.title.toLowerCase() === newTitle.trim().toLowerCase()
            );

            if (nameExists) {
              setTitleError("A collection with this name already exists");
            }
          }
          return currentData;
        });
      }, 300);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();

    if (isCreating) {
      return;
    }

    if (titleError) {
      showNotification(titleError, "error");
      return;
    }

    if (!validateMetadata()) {
      showNotification("Please fill in all required metadata fields", "error");
      return;
    }

    const nameExists = collections.some(
      (c) => c.title.toLowerCase() === formData.title.trim().toLowerCase()
    );

    if (nameExists) {
      showNotification("Collection name already exists", "error");
      return;
    }

    setIsCreating(true);

    const submittedData = { ...formData };
    const submittedMetadata = { ...metadataValues };

    setFormData({
      title: "",
      visibility: "public",
      text_direction: "ltr",
      language: "en",
    });
    setTitleError("");
    resetMetadata();

    try {
      const payload = {
        title: submittedData.title,
        visibility: submittedData.visibility,
        text_direction: submittedData.text_direction,
        language: submittedData.language,
        hierarchy: { chapter: 1, paragraph: 2 },
        collection_metadata: submittedMetadata,
        created_by_id: user?.id || 1,
      };

      await dispatch(createDocumentCollection(payload)).unwrap();
      setSubmitted(true);
      showNotification(
        `Collection "${submittedData.title}" created successfully!`,
        "success"
      );

      setTimeout(() => {
        dispatch(fetchDocumentCollections({ includeUsers: true }));
        onSuccess();
      }, 1000);
    } catch (error: unknown) {
      setFormData(submittedData);
      setMetadataValues(submittedMetadata);
      
      const errorMessage = error instanceof Error 
        ? error.message 
        : "Unknown error";
      showNotification(
        `Failed to create collection: ${errorMessage}`,
        "error"
      );
    } finally {
      setTimeout(() => {
        setIsCreating(false);
      }, 1000);
    }
  };

  return (
    <>
      <Typography variant="h5" gutterBottom>
        Add Document Collection
      </Typography>

      <div>
        <p>Complete this form to add your new Document Collection.</p>
      </div>

      <StyledForm onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="title">Title: </label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleTitleChange}
            disabled={isCreating}
            required
            style={{
              borderColor: titleError ? "red" : undefined,
              opacity: isCreating ? 0.6 : 1,
            }}
          />
          {titleError && (
            <div style={{ color: "red", fontSize: "14px", marginTop: "4px" }}>
              {titleError}
            </div>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="visibility">Visibility: </label>
          <select
            id="visibility"
            name="visibility"
            value={formData.visibility}
            onChange={handleChange}
            disabled={isCreating}
            style={{ opacity: isCreating ? 0.6 : 1 }}
          >
            <option value="public">Public</option>
            <option value="private">Private</option>
            <option value="restricted">Restricted</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="text_direction">Text Direction: </label>
          <select
            id="text_direction"
            name="text_direction"
            value={formData.text_direction}
            onChange={handleChange}
            disabled={isCreating}
            style={{ opacity: isCreating ? 0.6 : 1 }}
          >
            <option value="ltr">Left to Right (LTR)</option>
            <option value="rtl">Right to Left (RTL)</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="language">Language: </label>
          <select
            id="language"
            name="language"
            value={formData.language}
            onChange={handleChange}
            disabled={isCreating}
            style={{ opacity: isCreating ? 0.6 : 1 }}
          >
            <option value="en">English</option>
            <option value="ja">Japanese</option>
            <option value="fr">French</option>
            <option value="es">Spanish</option>
            <option value="de">German</option>
          </select>
        </div>

        <CollectionMetadataForm
          values={metadataValues}
          onChange={setMetadataValues}
          errors={metadataErrors}
          onErrorsChange={setMetadataErrors}
          disabled={isCreating}
        />

        <button type="submit" disabled={!!titleError || isCreating}>
          {isCreating ? "Creating Collection..." : "Add"}
        </button>
      </StyledForm>

      {submitted && (
        <div className="submitted-data">
          <h2>A new Document Collection has been added:</h2>
          <p><strong>Title:</strong> {formData.title}</p>
          <p><strong>Visibility:</strong> {formData.visibility}</p>
          <p><strong>Text Direction:</strong> {formData.text_direction}</p>
          <p><strong>Language:</strong> {formData.language}</p>
          <p><strong>User:</strong> {user?.first_name} {user?.last_name}</p>
        </div>
      )}
    </>
  );
};

export default AddCollection;