// src/features/documentView/components/externalReferences/ExternalReferenceIcon.tsx

import React, { useState } from "react";
import { Tooltip, Box } from "@mui/material";
import { Link as LinkIcon } from "@mui/icons-material";
import "@documentView/styles/ExternalReferenceStyles.css";

interface ExternalReferenceIconProps {
  index: number;
  url: string;
  title: string;
  onPreview: () => void;
}

const ExternalReferenceIcon: React.FC<ExternalReferenceIconProps> = ({
  url,
  title,
  onPreview,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Tooltip
      title={
        <Box sx={{ p: 1 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>{title}</div>
          <div style={{ fontSize: "0.75rem", color: "#e0e0e0" }}>{url}</div>
          <div
            style={{ fontSize: "0.7rem", marginTop: 4, fontStyle: "italic" }}
          >
            Click to preview
          </div>
        </Box>
      }
      placement="top"
      arrow
    >
      <sup
        className="external-reference-icon"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onPreview();
        }}
        style={{
          cursor: "pointer",
          marginLeft: "-3px",
          transition: "all 0.2s ease",
          verticalAlign: "super",
          lineHeight: "-2em",
          position: "relative",
          top: "-0.6em",
          display: "inline-flex",
          alignItems: "center",
        }}
      >
        <LinkIcon
          sx={{
            fontSize: "1em",
            color: isHovered ? "#1976d2" : "#0066cc",
            transform: isHovered ? "scale(1.1)" : "scale(1)",
            transition: "all 0.2s ease",
          }}
        />
      </sup>
    </Tooltip>
  );
};

export default ExternalReferenceIcon;
