import React, { useState } from 'react';
import {
  Box,
  Chip,
  TextField,
  Typography,
  FormHelperText,
} from '@mui/material';
import { MetadataFieldProps } from './types';

export const ListMetadataField: React.FC<MetadataFieldProps> = ({
  fieldKey,
  label,
  required,
  value,
  onChange,
  disabled,
  error,
}) => {
  const [inputValue, setInputValue] = useState('');
  const items = (Array.isArray(value) ? value : []) as string[];

  const handleAddItem = (newItem: string) => {
    const trimmed = newItem.trim();
    if (trimmed && !items.includes(trimmed)) {
      onChange([...items, trimmed]);
    }
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddItem(inputValue);
    }
  };

  const handleBlur = () => {
    if (inputValue.trim()) {
      handleAddItem(inputValue);
    }
  };

  const handleDelete = (itemToDelete: string) => {
    onChange(items.filter((item) => item !== itemToDelete));
  };

  return (
    <Box>
      <Typography variant="body2" sx={{ mb: 1 }}>
        {label}
        {required && <span style={{ color: 'red' }}> *</span>}
      </Typography>
      
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 0.5,
          mb: 1,
          minHeight: 32,
        }}
      >
        {items.map((item, index) => (
          <Chip
            key={`${item}-${index}`}
            label={item}
            onDelete={disabled ? undefined : () => handleDelete(item)}
            size="small"
            disabled={disabled}
          />
        ))}
      </Box>
      
      <TextField
        id={`metadata-${fieldKey}`}
        placeholder="Type and press Enter to add"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        disabled={disabled}
        error={!!error}
        fullWidth
        variant="outlined"
        size="small"
        sx={{
          opacity: disabled ? 0.6 : 1,
        }}
      />
      
      {error && <FormHelperText error>{error}</FormHelperText>}
    </Box>
  );
};