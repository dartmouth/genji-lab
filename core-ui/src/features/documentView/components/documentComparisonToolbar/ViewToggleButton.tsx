import React from "react";
import { ToggleButton, ToggleButtonGroup } from "@mui/material";
import {
  MenuBook as ReadingIcon,
  Comment as AnnotationIcon,
} from "@mui/icons-material";

interface ViewToggleButtonProps {
  viewModeChange: (mode: "reading" | "annotations") => void;
  viewMode: "reading" | "annotations";
}

const ViewToggleButton: React.FC<ViewToggleButtonProps> = ({
  viewModeChange,
  viewMode,
}) => {
  console.log("View Mode", viewMode);
  console.log("View Mode Change", viewModeChange);
  return (
    <ToggleButtonGroup
      value={viewMode}
      exclusive
      onChange={(_event, newMode) => {
        if (newMode !== null) {
          viewModeChange(newMode as "reading" | "annotations");
        }
      }}
      size="small"
      sx={{ flexShrink: 0 }}
    >
      <ToggleButton value="reading">
        <ReadingIcon sx={{ mr: 1 }} />
        Reading
      </ToggleButton>
      <ToggleButton value="annotations">
        <AnnotationIcon sx={{ mr: 1 }} />
        Annotations
      </ToggleButton>
    </ToggleButtonGroup>
  );
};

export default ViewToggleButton;
