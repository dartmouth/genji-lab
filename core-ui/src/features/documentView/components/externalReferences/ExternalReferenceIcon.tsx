// src/features/documentView/components/externalReferences/ExternalReferenceIcon.tsx

import React, { useState } from "react";
import { Tooltip, Box } from "@mui/material";
import "@documentView/styles/ExternalReferenceStyles.css";

interface ExternalReferenceIconProps {
  index: number;
  url: string;
  title: string;
  onPreview: () => void;
}

const ExternalReferenceIcon: React.FC<ExternalReferenceIconProps> = ({
  index,
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
          color: isHovered ? "#1976d2" : "#0066cc",
          fontWeight: 600,
          fontSize: "0.50em",
          textDecoration: isHovered ? "underline" : "none",
          marginLeft: "0px",
          transition: "all 0.2s ease",
          verticalAlign: "super",
          lineHeight: "0",
          position: "relative",
          top: "-0.4em",
        }}
      >
        [{index}]
      </sup>
    </Tooltip>
  );
};

export default ExternalReferenceIcon;
