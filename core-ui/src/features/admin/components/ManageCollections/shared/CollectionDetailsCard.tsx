// components/shared/CollectionDetailsCard.tsx

import React from "react";
import { Box, Typography } from "@mui/material";

export interface CollectionDetailsCardProps {
  details: {
    title: string;
    description?: string;
    visibility: string;
  };
  variant?: "info" | "warning";
  visibilityLabel?: string;
  children?: React.ReactNode;
}

export const CollectionDetailsCard: React.FC<CollectionDetailsCardProps> = ({
  details,
  variant = "info",
  visibilityLabel = "Visibility",
  children,
}) => {
  const bgColor = variant === "warning" ? "#fff3cd" : "#e3f2fd";
  const borderColor = variant === "warning" ? "#ffeaa7" : "#bbdefb";

  return (
    <Box
      sx={{
        mt: 2,
        p: 2,
        backgroundColor: bgColor,
        border: `1px solid ${borderColor}`,
        borderRadius: "4px",
      }}
    >
      <Typography variant="h6" gutterBottom>
        Collection Details:
      </Typography>
      <Typography variant="body2">
        <strong>Name:</strong> {details.title}
      </Typography>
      {details.description && (
        <Typography variant="body2">
          <strong>Description:</strong> {details.description}
        </Typography>
      )}
      <Typography variant="body2">
        <strong>{visibilityLabel}:</strong> {details.visibility}
      </Typography>
      {children}
    </Box>
  );
};

export default CollectionDetailsCard;