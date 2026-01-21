import React from 'react';
import { TextField } from '@mui/material';
import { MetadataFieldProps } from './types';

export const TextareaMetadataField: React.FC<MetadataFieldProps> = ({
  fieldKey,
  label,
  required,
  value,
  onChange,
  disabled,
  error,
}) => {
  return (
    <TextField
      id={`metadata-${fieldKey}`}
      label={
        <>
          {label}
          {required && <span style={{ color: 'red' }}> *</span>}
        </>
      }
      multiline
      rows={4}
      value={(value as string) || ''}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      error={!!error}
      helperText={error}
      fullWidth
      variant="outlined"
      size="small"
      sx={{
        opacity: disabled ? 0.6 : 1,
      }}
    />
  );
};