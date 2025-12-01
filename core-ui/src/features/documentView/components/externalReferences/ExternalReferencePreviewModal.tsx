// src/features/documentView/components/externalReferences/ExternalReferencePreviewModal.tsx

import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Link,
} from "@mui/material";
import { OpenInNew as OpenInNewIcon } from "@mui/icons-material";

interface ExternalReferencePreviewModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  url: string;
}

const ExternalReferencePreviewModal: React.FC<
  ExternalReferencePreviewModalProps
> = ({ open, onClose, title, description, url }) => {
  const handleOpenInNewTab = () => {
    window.open(url, "_blank", "noopener,noreferrer");
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: 3,
        },
      }}
    >
      <DialogTitle
        sx={{
          fontWeight: 600,
          fontSize: "1.25rem",
          borderBottom: 1,
          borderColor: "divider",
          pb: 2,
        }}
      >
        External Reference
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Title
            </Typography>
            <Typography variant="body1" fontWeight={500}>
              {title}
            </Typography>
          </Box>

          {description && (
            <Box>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                gutterBottom
              >
                Description
              </Typography>
              <Typography variant="body2">{description}</Typography>
            </Box>
          )}

          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              URL
            </Typography>
            <Link
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                wordBreak: "break-all",
                fontSize: "0.875rem",
                display: "inline-flex",
                alignItems: "center",
                gap: 0.5,
              }}
            >
              {url}
              <OpenInNewIcon sx={{ fontSize: 16 }} />
            </Link>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2, borderTop: 1, borderColor: "divider" }}>
        <Button onClick={onClose}>Close</Button>
        <Button
          onClick={handleOpenInNewTab}
          variant="contained"
          startIcon={<OpenInNewIcon />}
          sx={{backgroundColor: '#2C656B'}}
        >
          Open in New Tab
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ExternalReferencePreviewModal;
