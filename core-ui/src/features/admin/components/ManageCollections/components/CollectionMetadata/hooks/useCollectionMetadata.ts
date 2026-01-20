import { useState, useEffect } from "react";
import { MetadataField } from '../types'

import axios, { AxiosInstance } from 'axios';

const api: AxiosInstance = axios.create({
  baseURL: '/api/v1',
  timeout: 10000,
});

export const useCollectionMetadata = () => {
  const [metadataValues, setMetadataValues] = useState<Record<string, string>>({});
  const [metadataErrors, setMetadataErrors] = useState<Record<string, string>>({});
  const [metadataSchema, setMetadataSchema] = useState<MetadataField[]>([]);

  // Fetch schema for validation purposes
  useEffect(() => {
    const fetchSchema = async () => {
      try {
        const response = await api.get('/site-settings/collection-metadata-schema');
        setMetadataSchema(response.data || []);
      } catch (error) {
        console.error('Failed to fetch metadata schema:', error);
      }
    };
    fetchSchema();
  }, []);

  const validateMetadata = (): boolean => {
    const errors: Record<string, string> = {};

    metadataSchema.forEach((field) => {
      if (field.required && !metadataValues[field.key]?.trim()) {
        errors[field.key] = `${field.label} is required`;
      }
    });

    setMetadataErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const resetMetadata = () => {
    const resetValues: Record<string, string> = {};
    metadataSchema.forEach((field) => {
      resetValues[field.key] = '';
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