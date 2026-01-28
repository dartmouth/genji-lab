import React, { useState, useEffect } from "react";
import { Box, Typography, LinearProgress, Divider } from "@mui/material";
import axios, { AxiosInstance } from "axios";

import { MetadataField } from "@admin/components/SiteSettings/types";
import { TextMetadataField } from "./TextMetadataField";
import { TextareaMetadataField } from "./TextareaMetadataField";
import { ListMetadataField } from "./ListMetadataField";
import { ImageMetadataField } from "./ImageMetadataField";
import { CollectionMetadata } from "@/store/slice/documentCollectionSlice";
import {
  CollectionMetadataFormProps,
  MetadataValue,
  Base64Image,
} from "./types";

const api: AxiosInstance = axios.create({
  baseURL: "/api/v1",
  timeout: 10000,
});

export const CollectionMetadataForm: React.FC<CollectionMetadataFormProps> = ({
  values,
  onChange,
  errors,
  onErrorsChange,
  disabled = false,
}) => {
  const [metadataSchema, setMetadataSchema] = useState<MetadataField[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchMetadataSchema = async () => {
      setIsLoading(true);
      try {
        const response = await api.get(
          "/site-settings/collection-metadata-schema"
        );
        const schema = response.data || [];
        setMetadataSchema(schema);

        const initialValues: CollectionMetadata = { ...values };
        schema.forEach((field: MetadataField) => {
          if (!(field.key in initialValues)) {
            initialValues[field.key] = getDefaultValue(field.type);
          }
        });

        if (Object.keys(initialValues).length !== Object.keys(values).length) {
          onChange(initialValues);
        }
      } catch (error) {
        console.error("Failed to fetch metadata schema:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMetadataSchema();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getDefaultValue = (type: MetadataField["type"]): MetadataValue => {
    switch (type) {
      case "list":
        return [];
      case "image":
        return { mime_type: "", img_base64: "" };
      default:
        return "";
    }
  };

  const handleFieldChange = (key: string, value: MetadataValue) => {
    onChange({
      ...values,
      [key]: value,
    });

    if (errors[key]) {
      const newErrors = { ...errors };
      delete newErrors[key];
      onErrorsChange(newErrors);
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    metadataSchema.forEach((field) => {
      if (field.required) {
        const value = values[field.key];
        let isEmpty = false;

        switch (field.type) {
          case "list":
            isEmpty = !Array.isArray(value) || value.length === 0;
            break;
          case "image": {
            const imgValue = value as Base64Image;
            isEmpty = !imgValue?.img_base64;
            break;
          }
          default:
            isEmpty = typeof value !== "string" || !value.trim();
        }

        if (isEmpty) {
          newErrors[field.key] = `${field.label} is required`;
        }
      }
    });

    onErrorsChange(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (CollectionMetadataForm as any).validate = validate;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metadataSchema, values]);

  const renderField = (field: MetadataField) => {
    const commonProps = {
      fieldKey: field.key,
      label: field.label,
      required: field.required,
      value: values[field.key],
      onChange: handleFieldChange,
      disabled,
      error: errors[field.key],
    };

    switch (field.type) {
      case "textarea":
        return <TextareaMetadataField {...commonProps} />;
      case "list":
        return <ListMetadataField {...commonProps} />;
      case "image":
        return <ImageMetadataField {...commonProps} />;
      case "text":
      default:
        return <TextMetadataField {...commonProps} />;
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ my: 2 }}>
        <LinearProgress />
        <Typography variant="body2" sx={{ mt: 1 }}>
          Loading metadata fields...
        </Typography>
      </Box>
    );
  }

  if (metadataSchema.length === 0) {
    return null;
  }

  return (
    <Box sx={{ my: 3 }}>
      <Divider sx={{ mb: 2 }} />
      <Typography variant="h6" gutterBottom>
        Collection Metadata
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Please provide the following information about this collection.
      </Typography>

      {metadataSchema.map((field) => (
        <Box key={field.key} sx={{ mb: 2 }}>
          {renderField(field)}
        </Box>
      ))}
    </Box>
  );
};
