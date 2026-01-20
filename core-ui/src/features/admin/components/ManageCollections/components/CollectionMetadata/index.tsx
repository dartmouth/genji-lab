import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  LinearProgress,
  Divider,
} from '@mui/material';

import {MetadataField, CollectionMetadataFormProps} from './types'

import axios, { AxiosInstance } from 'axios';

const api: AxiosInstance = axios.create({
  baseURL: '/api/v1',
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

  // Fetch metadata schema on component mount
  useEffect(() => {
    const fetchMetadataSchema = async () => {
      setIsLoading(true);
      try {
        const response = await api.get('/site-settings/collection-metadata-schema');
        const schema = response.data || [];
        setMetadataSchema(schema);
        
        // Initialize values with empty strings for any missing keys
        const initialValues: Record<string, string> = { ...values };
        schema.forEach((field: MetadataField) => {
          if (!(field.key in initialValues)) {
            initialValues[field.key] = '';
          }
        });
        
        // Only update if there are new keys
        if (Object.keys(initialValues).length !== Object.keys(values).length) {
          onChange(initialValues);
        }
      } catch (error) {
        console.error('Failed to fetch metadata schema:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMetadataSchema();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handler for metadata field changes
  const handleFieldChange = (key: string, value: string) => {
    onChange({
      ...values,
      [key]: value,
    });

    // Clear error when user starts typing
    if (errors[key]) {
      const newErrors = { ...errors };
      delete newErrors[key];
      onErrorsChange(newErrors);
    }
  };

  // Validation function - can be called from parent
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    metadataSchema.forEach((field) => {
      if (field.required && !values[field.key]?.trim()) {
        newErrors[field.key] = `${field.label} is required`;
      }
    });

    onErrorsChange(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Expose validate function via ref or callback
  useEffect(() => {
    // Store validate function reference that parent can access
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (CollectionMetadataForm as any).validate = validate;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metadataSchema, values]);

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
          {field.type === 'textarea' ? (
            <TextField
              id={`metadata-${field.key}`}
              label={
                <>
                  {field.label}
                  {field.required && <span style={{ color: 'red' }}> *</span>}
                </>
              }
              multiline
              rows={4}
              value={values[field.key] || ''}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
              disabled={disabled}
              error={!!errors[field.key]}
              helperText={errors[field.key]}
              fullWidth
              variant="outlined"
              size="small"
              sx={{
                opacity: disabled ? 0.6 : 1,
              }}
            />
          ) : (
            <TextField
              id={`metadata-${field.key}`}
              label={
                <>
                  {field.label}
                  {field.required && <span style={{ color: 'red' }}> *</span>}
                </>
              }
              value={values[field.key] || ''}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
              disabled={disabled}
              error={!!errors[field.key]}
              helperText={errors[field.key]}
              fullWidth
              variant="outlined"
              size="small"
              sx={{
                opacity: disabled ? 0.6 : 1,
              }}
            />
          )}
        </Box>
      ))}
    </Box>
  );
};

