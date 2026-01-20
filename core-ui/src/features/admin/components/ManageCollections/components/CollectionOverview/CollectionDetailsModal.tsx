// components/CollectionOverview/CollectionDetailsModal.tsx

import React, { useState, useEffect } from "react";
import {
  Typography,
  Box,
  Modal,
  IconButton,
  Grid,
  Divider,
  Skeleton,
  Chip,
} from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";
import axios, { AxiosInstance } from "axios";

import { CollectionDetails, NotificationState, UserReference } from "../../types";

const api: AxiosInstance = axios.create({
  baseURL: "/api/v1",
  timeout: 10000,
});

const modalStyle = {
  position: "absolute" as const,
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: { xs: "90%", sm: 800, md: 1000 },
  maxHeight: "90vh",
  bgcolor: "background.paper",
  border: "2px solid #000",
  borderRadius: 2,
  boxShadow: 24,
  p: 4,
  overflow: "auto",
};

export interface CollectionDetailsModalProps {
  open: boolean;
  collectionId: number | null;
  onClose: () => void;
  showNotification: (
    message: string,
    severity: NotificationState["severity"]
  ) => void;
}

const getUserDisplayName = (user: UserReference): string => {
  if (user.first_name || user.last_name) {
    return `${user.first_name || ""} ${user.last_name || ""}`.trim();
  }
  return user.username || "Unknown User";
};

export const CollectionDetailsModal: React.FC<CollectionDetailsModalProps> = ({
  open,
  collectionId,
  onClose,
  showNotification,
}) => {
  const [details, setDetails] = useState<CollectionDetails | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    const fetchDetails = async (): Promise<void> => {
      if (!collectionId || !open) return;

      setIsLoading(true);
      setDetails(null);

      try {
        const response = await api.get(`/collections/${collectionId}`);
        setDetails(response.data);
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to fetch collection details";
        showNotification(errorMessage, "error");
        onClose();
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetails();
  }, [collectionId, open, showNotification, onClose]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      aria-labelledby="collection-details-modal"
      aria-describedby="collection-details-description"
    >
      <Box sx={modalStyle}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 3,
          }}
        >
          <Typography variant="h5" component="h2">
            Collection Details
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>

        {isLoading ? (
          <Box>
            <Skeleton variant="text" width="60%" height={32} />
            <Skeleton variant="text" width="40%" height={24} />
            <Skeleton
              variant="rectangular"
              width="100%"
              height={200}
              sx={{ mt: 2 }}
            />
          </Box>
        ) : details ? (
          <Grid container spacing={3}>
            {/* Basic Information */}
            <Grid item xs={12} md={6}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Basic Information
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Title
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {details.title}
                </Typography>
              </Box>
              {details.description && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Description
                  </Typography>
                  <Typography variant="body1">
                    {details.description}
                  </Typography>
                </Box>
              )}
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Visibility
                </Typography>
                <Chip
                  label={details.visibility}
                  size="small"
                  color={details.visibility === "public" ? "success" : "default"}
                  sx={{ mt: 0.5 }}
                />
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Language
                </Typography>
                <Typography variant="body1">{details.language}</Typography>
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Text Direction
                </Typography>
                <Typography variant="body1">{details.text_direction}</Typography>
              </Box>
            </Grid>

            {/* Statistics */}
            <Grid item xs={12} md={6}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Statistics
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Box
                    sx={{
                      p: 2,
                      bgcolor: "primary.50",
                      borderRadius: 1,
                      textAlign: "center",
                    }}
                  >
                    <Typography
                      variant="h4"
                      color="primary.main"
                      fontWeight="bold"
                    >
                      {details.document_count}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Documents
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box
                    sx={{
                      p: 2,
                      bgcolor: "secondary.50",
                      borderRadius: 1,
                      textAlign: "center",
                    }}
                  >
                    <Typography
                      variant="h4"
                      color="secondary.main"
                      fontWeight="bold"
                    >
                      {details.element_count}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Paragraphs
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box
                    sx={{
                      p: 2,
                      bgcolor: "success.50",
                      borderRadius: 1,
                      textAlign: "center",
                    }}
                  >
                    <Typography
                      variant="h4"
                      color="success.main"
                      fontWeight="bold"
                    >
                      {details.scholarly_annotation_count}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Scholarly Annotations
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box
                    sx={{
                      p: 2,
                      bgcolor: "warning.50",
                      borderRadius: 1,
                      textAlign: "center",
                    }}
                  >
                    <Typography
                      variant="h4"
                      color="warning.main"
                      fontWeight="bold"
                    >
                      {details.comment_count}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Comments
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Grid>

            {/* Metadata */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Metadata
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      gutterBottom
                    >
                      Created
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {new Date(details.created).toLocaleDateString()} at{" "}
                      {new Date(details.created).toLocaleTimeString()}
                    </Typography>
                    {details.created_by ? (
                      <Typography variant="body2" color="text.secondary">
                        by {getUserDisplayName(details.created_by)}
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        by Unknown User
                      </Typography>
                    )}
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      gutterBottom
                    >
                      Last Modified
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {new Date(details.modified).toLocaleDateString()} at{" "}
                      {new Date(details.modified).toLocaleTimeString()}
                    </Typography>
                    {details.modified_by ? (
                      <Typography variant="body2" color="text.secondary">
                        by {getUserDisplayName(details.modified_by)}
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        by Unknown User
                      </Typography>
                    )}
                  </Box>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Failed to load collection details
          </Typography>
        )}
      </Box>
    </Modal>
  );
};

export default CollectionDetailsModal;