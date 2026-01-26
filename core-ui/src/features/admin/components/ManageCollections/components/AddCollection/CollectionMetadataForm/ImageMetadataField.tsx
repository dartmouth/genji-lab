import React, { useRef } from "react";
import { Box, Button, Typography, FormHelperText } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import { MetadataFieldProps, Base64Image } from "./types";

const MAX_FILE_SIZE_MB = 2;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export const ImageMetadataField: React.FC<MetadataFieldProps> = ({
  fieldKey,
  label,
  required,
  value,
  onChange,
  disabled,
  error,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageValue = value as Base64Image | undefined;
  const hasImage = imageValue?.img_base64 && imageValue?.mime_type;

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (file.type !== "image/png") {
      alert("Please select a PNG image file.");
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      alert(`File size must be less than ${MAX_FILE_SIZE_MB}MB.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      // dataUrl format: "data:image/png;base64,<base64string>"
      const base64String = dataUrl.split(",")[1];

      onChange(fieldKey, {
        mime_type: file.type,
        img_base64: base64String,
      });
    };
    reader.onerror = () => {
      alert("Failed to read file. Please try again.");
    };
    reader.readAsDataURL(file);

    // Reset input so same file can be selected again
    e.target.value = "";
  };

  const handleClear = () => {
    onChange(fieldKey, { mime_type: "", img_base64: "" });
  };

  return (
    <Box>
      <Typography variant="body2" sx={{ mb: 1 }}>
        {label}
        {required && <span style={{ color: "red" }}> *</span>}
      </Typography>

      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png"
          onChange={handleFileChange}
          style={{ display: "none" }}
          id={`metadata-${fieldKey}`}
        />

        <Button
          variant="outlined"
          onClick={handleButtonClick}
          disabled={disabled}
          startIcon={<UploadFileIcon />}
          size="small"
          sx={{
            opacity: disabled ? 0.6 : 1,
          }}
        >
          {hasImage ? "Replace Image" : "Upload PNG"}
        </Button>

        {hasImage && (
          <>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <CheckCircleIcon color="success" fontSize="small" />
              <Typography variant="body2" color="success.main">
                Image uploaded
              </Typography>
            </Box>

            <Button
              variant="text"
              onClick={handleClear}
              disabled={disabled}
              size="small"
              color="error"
            >
              Remove
            </Button>
          </>
        )}
      </Box>

      {error && <FormHelperText error>{error}</FormHelperText>}
    </Box>
  );
};
