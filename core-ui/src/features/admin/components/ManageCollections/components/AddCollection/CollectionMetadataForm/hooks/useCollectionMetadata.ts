import { useState, useEffect } from "react";
import { MetadataField } from "@admin/components/SiteSettings/types";
import {
  MetadataValue,
  Base64Image,
} from "@admin/components/ManageCollections/components/AddCollection/CollectionMetadataForm/types";
import { CollectionMetadata } from "@/store/slice/documentCollectionSlice"; // Add this import

import axios, { AxiosInstance } from "axios";

const api: AxiosInstance = axios.create({
  baseURL: "/api/v1",
  timeout: 10000,
});

export const useCollectionMetadata = () => {
  // Change this type:
  const [metadataValues, setMetadataValues] = useState<CollectionMetadata>({});
  const [metadataErrors, setMetadataErrors] = useState<Record<string, string>>(
    {}
  );
  const [metadataSchema, setMetadataSchema] = useState<MetadataField[]>([]);

  // Fetch schema for validation purposes
  useEffect(() => {
    const fetchSchema = async () => {
      try {
        const response = await api.get(
          "/site-settings/collection-metadata-schema"
        );
        setMetadataSchema(response.data || []);
      } catch (error) {
        console.error("Failed to fetch metadata schema:", error);
      }
    };
    fetchSchema();
  }, []);

  const validateMetadata = (): boolean => {
    const errors: Record<string, string> = {};

    metadataSchema.forEach((field) => {
      if (field.required) {
        const value = metadataValues[field.key];
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
          errors[field.key] = `${field.label} is required`;
        }
      }
    });

    setMetadataErrors(errors);
    return Object.keys(errors).length === 0;
  };

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

  const resetMetadata = () => {
    const resetValues: CollectionMetadata = {}; // Change this type
    metadataSchema.forEach((field) => {
      resetValues[field.key] = getDefaultValue(field.type);
    });
    setMetadataValues(resetValues);
    setMetadataErrors({});
  };

  return {
    metadataValues,
    setMetadataValues,
    metadataErrors,
    setMetadataErrors,
    validateMetadata,
    resetMetadata,
  };
};
