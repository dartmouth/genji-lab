import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Alert,
  CircularProgress,
  TextField,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { Add, Edit, Delete } from '@mui/icons-material';
import { useAuth } from '@hooks/useAuthContext';
import axios, { AxiosInstance } from "axios";
const api: AxiosInstance = axios.create({
  baseURL: "/api/v1",
  timeout: 10000,
});

import { MetadataField } from './types';



const CollectionMetadataSettings: React.FC = () => {
  const { user } = useAuth();
  
  // State
  const [schema, setSchema] = useState<MetadataField[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Dialog state
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [dialogMode, setDialogMode] = useState<'add' | 'edit'>('add');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [currentField, setCurrentField] = useState<MetadataField>({
    key: '',
    label: '',
    type: 'text',
    required: false
  });
  const [validationError, setValidationError] = useState<string | null>(null);

  // Load schema on mount
  useEffect(() => {
    loadSchema();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadSchema = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.get('/site-settings/collection-metadata-schema');
      setSchema(response.data || []);
      console.log(schema)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error('Failed to load metadata schema:', err);
      setError(err.response?.data?.detail || 'Failed to load metadata schema');
    } finally {
      setIsLoading(false);
    }
  };

  const validateField = (field: MetadataField): string | null => {
    if (!field.key.trim()) {
      return 'Key is required';
    }
    if (!/^[a-z_][a-z0-9_]*$/.test(field.key)) {
      return 'Key must start with a letter, contain only lowercase letters, numbers, and underscores';
    }
    if (!field.label.trim()) {
      return 'Label is required';
    }
    if (field.label.length > 100) {
      return 'Label must be 100 characters or less';
    }
    
    // Check for duplicate keys (except when editing the same field)
    const isDuplicate = schema.some((f, index) => 
      f.key === field.key && (dialogMode === 'add' || index !== editingIndex)
    );
    if (isDuplicate) {
      return 'A field with this key already exists';
    }
    
    return null;
  };

  const handleOpenDialog = (mode: 'add' | 'edit', index?: number) => {
    setDialogMode(mode);
    setValidationError(null);
    
    if (mode === 'edit' && index !== undefined) {
      setEditingIndex(index);
      setCurrentField({ ...schema[index] });
    } else {
      setEditingIndex(null);
      setCurrentField({
        key: '',
        label: '',
        type: 'text',
        required: false
      });
    }
    
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setCurrentField({
      key: '',
      label: '',
      type: 'text',
      required: false
    });
    setValidationError(null);
    setEditingIndex(null);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleFieldChange = (field: keyof MetadataField, value: any) => {
    setCurrentField(prev => ({ ...prev, [field]: value }));
    setValidationError(null);
  };

  const handleSaveField = async () => {
    const error = validateField(currentField);
    if (error) {
      setValidationError(error);
      return;
    }

    if (!user?.id) {
      setValidationError('User not authenticated');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      if (dialogMode === 'add') {
        await api.post('/site-settings/collection-metadata-schema/fields', {
          field: currentField,
          user_id: user.id
        });
        setSuccessMessage('Field added successfully!');
      } else {
        const originalKey = schema[editingIndex!].key;
        await api.patch(`/site-settings/collection-metadata-schema/fields/${originalKey}`, {
          field: currentField,
          user_id: user.id
        });
        setSuccessMessage('Field updated successfully!');
      }

      await loadSchema();
      handleCloseDialog();
      setTimeout(() => setSuccessMessage(null), 3000);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error('Failed to save field:', err);
      setValidationError(err.response?.data?.detail || 'Failed to save field');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteField = async (fieldKey: string) => {
    if (!user?.id) {
      setError('User not authenticated');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete the field "${fieldKey}"?`)) {
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      await api.delete(`/site-settings/collection-metadata-schema/fields/${fieldKey}`, {
        params: { user_id: user.id }
      });

      setSuccessMessage('Field deleted successfully!');
      await loadSchema();
      setTimeout(() => setSuccessMessage(null), 3000);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error('Failed to delete field:', err);
      setError(err.response?.data?.detail || 'Failed to delete field');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading metadata schema...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" component="h2">
          Collection Metadata Schema
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog('add')}
          disabled={isSaving}
        >
          Add Field
        </Button>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Define the metadata fields that users must fill out when creating a new collection.
        These fields will be displayed as a form when creating collections.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {successMessage && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      )}

      {schema.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            No metadata fields configured. Click "Add Field" to get started.
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Key</TableCell>
                <TableCell>Label</TableCell>
                <TableCell>Required</TableCell>
                <TableCell>Type</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {schema.map((field, index) => (
                <TableRow key={field.key}>
                  <TableCell>
                    <code>{field.key}</code>
                  </TableCell>
                  <TableCell>{field.label}</TableCell>
                  <TableCell>
                    {field.required ? (
                      <Chip label="Required" size="small" color="primary" />
                    ) : (
                      <Chip label="Optional" size="small" variant="outlined" />
                    )}
                  </TableCell>
                  <TableCell>
                    {field.type}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDialog('edit', index)}
                      disabled={isSaving}
                      title="Edit field"
                    >
                      <Edit />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDeleteField(field.key)}
                      disabled={isSaving}
                      title="Delete field"
                    >
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {dialogMode === 'add' ? 'Add Metadata Field' : 'Edit Metadata Field'}
        </DialogTitle>
        <DialogContent>
          {validationError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {validationError}
            </Alert>
          )}

          <TextField
            fullWidth
            label="Key"
            value={currentField.key}
            onChange={(e) => handleFieldChange('key', e.target.value.toLowerCase())}
            disabled={dialogMode === 'edit'}
            helperText="Lowercase letters, numbers, and underscores only (e.g., synopsis, character_list)"
            sx={{ mt: 2, mb: 2 }}
          />

          <TextField
            fullWidth
            label="Label"
            value={currentField.label}
            onChange={(e) => handleFieldChange('label', e.target.value)}
            helperText="Display name shown to users"
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth>
            <InputLabel id="demo-simple-select-label">Type</InputLabel>
            <Select
              labelId="demo-simple-select-label"
              id="demo-simple-select"
              value={currentField.type}
              label="Age"
              onChange={(e) => handleFieldChange('type', e.target.value.toLowerCase())}
            >
              <MenuItem value={'text'}>Short Text (text)</MenuItem>
              <MenuItem value={'textarea'}>Long Text (textarea)</MenuItem>
              <MenuItem value={'list'}>List of Items (list)</MenuItem>
              <MenuItem value={'image'}>Uploaded Image (image)</MenuItem>
            </Select>
          </FormControl>
          <FormControlLabel
            control={
              <Checkbox
                checked={currentField.required}
                onChange={(e) => handleFieldChange('required', e.target.checked)}
              />
            }
            label="Required field"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            onClick={handleSaveField}
            variant="contained"
            disabled={isSaving}
            startIcon={isSaving ? <CircularProgress size={20} /> : null}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CollectionMetadataSettings;