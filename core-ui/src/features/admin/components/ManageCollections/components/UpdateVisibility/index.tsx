// components/UpdateVisibility/index.tsx

import React, { useState } from "react";
import {
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  LinearProgress,
  SelectChangeEvent,
} from "@mui/material";
import axios, { AxiosInstance } from "axios";

import { useAuth } from "@hooks/useAuthContext";
import {
  updateDocumentCollection,
  fetchDocumentCollections,
  useAppDispatch,
} from "@store";

import { CollectionSelect } from "../../shared/CollectionSelect";
import { CollectionDetailsCard } from "../../shared/CollectionDetailsCard";
import { StyledForm } from "../../shared/StyledForm";
import {
  DocumentCollection,
  NotificationState,
//   CollectionVisibility,
  VisibilityCollectionDetails,
} from "../../types";

const api: AxiosInstance = axios.create({
  baseURL: "/api/v1",
  timeout: 10000,
});

export interface UpdateVisibilityProps {
  /** List of available collections */
  collections: DocumentCollection[];
  /** Callback when update succeeds */
  onSuccess: () => void;
  /** Function to show notifications */
  showNotification: (
    message: string,
    severity: NotificationState["severity"]
  ) => void;
}

export const UpdateVisibility: React.FC<UpdateVisibilityProps> = ({
  collections,
  onSuccess,
  showNotification,
}) => {
  const dispatch = useAppDispatch();
  const { user } = useAuth();

  const [selectedCollection, setSelectedCollection] = useState<string>("");
  const [newVisibility, setNewVisibility] = useState<string>("");
  const [collectionDetails, setCollectionDetails] =
    useState<VisibilityCollectionDetails | null>(null);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(false);

  const handleCollectionSelect = async (event: SelectChangeEvent<string>) => {
    const collectionId = event.target.value;
    setSelectedCollection(collectionId);
    setNewVisibility("");
    setCollectionDetails(null);

    if (collectionId) {
      setIsLoadingDetails(true);
      try {
        const response = await api.get(`/collections/${collectionId}`);
        const collectionData = response.data;
        setCollectionDetails({
          title: collectionData.title,
          visibility: collectionData.visibility,
          description: collectionData.description,
        });
        setNewVisibility(collectionData.visibility);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.detail ||
          error.message ||
          "Error fetching collection details";
        showNotification(errorMessage, "error");
      } finally {
        setIsLoadingDetails(false);
      }
    }
  };

  const handleNewVisibilityChange = (event: SelectChangeEvent<string>) => {
    setNewVisibility(event.target.value);
  };

  const isFormValid = (): boolean => {
    return (
      selectedCollection !== "" &&
      newVisibility !== "" &&
      collectionDetails !== null &&
      newVisibility !== collectionDetails.visibility
    );
  };

  const handleUpdateVisibility = async () => {
    if (!selectedCollection || !newVisibility) {
      showNotification(
        "Please select a collection and visibility option",
        "error"
      );
      return;
    }

    if (!collectionDetails) {
      showNotification("Collection details not loaded", "error");
      return;
    }

    if (newVisibility === collectionDetails.visibility) {
      showNotification(
        "New visibility must be different from current visibility",
        "error"
      );
      return;
    }

    setIsUpdating(true);

    try {
      await dispatch(
        updateDocumentCollection({
          id: parseInt(selectedCollection),
          updates: {
            visibility: newVisibility,
            modified_by_id: user?.id || 1,
          },
        })
      ).unwrap();

      // Refresh collections to show updated data
      dispatch(fetchDocumentCollections({ includeUsers: true }));

      // Update the local collection details to reflect the change
      setCollectionDetails({
        ...collectionDetails,
        visibility: newVisibility,
      });

      showNotification(
        `Collection visibility updated from "${collectionDetails.visibility}" to "${newVisibility}" for collection "${collectionDetails.title}"`,
        "success"
      );

      // Notify parent of success
      onSuccess();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      showNotification(
        `Failed to update collection visibility: ${errorMessage}`,
        "error"
      );
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <>
      <Typography variant="h5" gutterBottom>
        Update Collection Visibility
      </Typography>

      <p>Select a collection to update its visibility setting:</p>

      <StyledForm>
        <CollectionSelect
          id="update-visibility-collection-select"
          value={selectedCollection}
          onChange={handleCollectionSelect}
          collections={collections}
          disabled={isUpdating}
        />

        {isLoadingDetails && (
          <Box sx={{ width: "100%", mt: 2 }}>
            <LinearProgress />
            <Typography variant="body2" sx={{ mt: 1 }}>
              Loading collection details...
            </Typography>
          </Box>
        )}

        {collectionDetails && (
          <CollectionDetailsCard
            details={{
              title: collectionDetails.title,
              description: collectionDetails.description,
              visibility: collectionDetails.visibility,
            }}
            variant="info"
            visibilityLabel="Current Visibility"
          />
        )}

        {collectionDetails && (
          <div className="form-group" style={{ marginTop: "16px" }}>
            <FormControl fullWidth sx={{ maxWidth: "400px" }}>
              <InputLabel id="update-visibility-new-visibility-label">
                New Visibility
              </InputLabel>
              <Select
                labelId="update-visibility-new-visibility-label"
                id="update-visibility-new-visibility-select"
                value={newVisibility}
                label="New Visibility"
                onChange={handleNewVisibilityChange}
                disabled={isUpdating}
              >
                <MenuItem value="public">Public</MenuItem>
                <MenuItem value="private">Private</MenuItem>
                <MenuItem value="restricted">Restricted</MenuItem>
              </Select>
            </FormControl>
          </div>
        )}

        <Button
          variant="contained"
          color="primary"
          onClick={handleUpdateVisibility}
          disabled={!isFormValid() || isUpdating}
          sx={{ marginTop: 2 }}
        >
          {isUpdating ? "Updating..." : "Update Visibility"}
        </Button>
      </StyledForm>
    </>
  );
};

export default UpdateVisibility;