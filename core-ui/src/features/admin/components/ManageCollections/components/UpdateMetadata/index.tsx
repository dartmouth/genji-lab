// components/UpdateMetadata/index.tsx

import React, { useState, useEffect } from "react";
import { Typography } from "@mui/material";

import {
  updateDocumentCollection,
  fetchDocumentCollections,
  useAppDispatch,
} from "@store";

import { StyledForm } from "../../shared/StyledForm";

import { useCollectionMetadata } from "../AddCollection/CollectionMetadataForm/hooks/useCollectionMetadata";
import { CollectionMetadataForm } from "../AddCollection/CollectionMetadataForm";

import { DocumentCollection } from "@/store/slice/documentCollectionSlice";

import { NotificationState } from "../../types";

export interface UpdateMetadataProps {
  collections: DocumentCollection[];
  onSuccess: () => void;
  showNotification: (
    message: string,
    severity: NotificationState["severity"]
  ) => void;
}

export const UpdateMetadata: React.FC<UpdateMetadataProps> = ({
  collections,
  onSuccess,
  showNotification,
}) => {
  const dispatch = useAppDispatch();

  const [selectedCollectionId, setSelectedCollectionId] = useState<string>("");
  const [textDirection, setTextDirection] = useState<string>("ltr");
  const [language, setLanguage] = useState<string>("en");
  const [isUpdating, setIsUpdating] = useState(false);

  const {
    metadataValues,
    setMetadataValues,
    metadataErrors,
    setMetadataErrors,
    validateMetadata,
    resetMetadata,
  } = useCollectionMetadata();

  const selectedCollection = collections.find(
    (c) => c.id.toString() === selectedCollectionId
  );

  useEffect(() => {
    if (selectedCollection) {
      setTextDirection(selectedCollection.text_direction || "ltr");
      setLanguage(selectedCollection.language || "en");
      
      if (selectedCollection.collection_metadata) {
        setMetadataValues(selectedCollection.collection_metadata);
      } else {
        resetMetadata();
      }
    } else {
      setTextDirection("ltr");
      setLanguage("en");
      resetMetadata();
    }
  }, [selectedCollection, setMetadataValues, resetMetadata]);

  const handleCollectionChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ): void => {
    setSelectedCollectionId(e.target.value);
  };

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    e.preventDefault();

    if (isUpdating) {
      return;
    }

    if (!selectedCollectionId) {
      showNotification("Please select a collection", "error");
      return;
    }

    if (!validateMetadata()) {
      showNotification("Please fill in all required metadata fields", "error");
      return;
    }

    setIsUpdating(true);

    try {
      await dispatch(
        updateDocumentCollection({
          id: parseInt(selectedCollectionId, 10),
          updates: {
            text_direction: textDirection,
            language: language,
            collection_metadata: metadataValues,
          },
        })
      ).unwrap();

      showNotification(
        `Collection "${selectedCollection?.title}" updated successfully!`,
        "success"
      );

      setTimeout(() => {
        dispatch(fetchDocumentCollections({ includeUsers: true }));
        onSuccess();
      }, 1000);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      showNotification(
        `Failed to update collection: ${errorMessage}`,
        "error"
      );
    } finally {
      setTimeout(() => {
        setIsUpdating(false);
      }, 1000);
    }
  };

  return (
    <>
      <Typography variant="h5" gutterBottom>
        Update Collection Metadata
      </Typography>

      <div>
        <p>Select a collection and update its metadata fields.</p>
      </div>

      <StyledForm onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="collection">Select Collection: </label>
          <select
            id="collection"
            name="collection"
            value={selectedCollectionId}
            onChange={handleCollectionChange}
            disabled={isUpdating}
            required
            style={{ opacity: isUpdating ? 0.6 : 1 }}
          >
            <option value="">-- Select a collection --</option>
            {collections.map((collection) => (
              <option key={collection.id} value={collection.id.toString()}>
                {collection.title}
              </option>
            ))}
          </select>
        </div>

        {selectedCollectionId && (
          <>
            <div className="form-group">
              <label htmlFor="text_direction">Text Direction: </label>
              <select
                id="text_direction"
                name="text_direction"
                value={textDirection}
                onChange={(e) => setTextDirection(e.target.value)}
                disabled={isUpdating}
                style={{ opacity: isUpdating ? 0.6 : 1 }}
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
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                disabled={isUpdating}
                style={{ opacity: isUpdating ? 0.6 : 1 }}
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
              disabled={isUpdating}
            />
          </>
        )}

        <button
          type="submit"
          disabled={!selectedCollectionId || isUpdating}
        >
          {isUpdating ? "Updating..." : "Update Metadata"}
        </button>
      </StyledForm>
    </>
  );
};

export default UpdateMetadata;