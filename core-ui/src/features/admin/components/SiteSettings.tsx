import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Alert,
  CircularProgress,
  Chip,
  Divider
} from '@mui/material';
import { useAppDispatch, useAppSelector } from '@store/hooks';
import { fetchSiteSettings, updateSiteSettings, clearError } from '@store/slice/siteSettingsSlice';
import { useAuth } from '@hooks/useAuthContext';

interface SiteSettings {
  id: number;
  site_title: string;
  site_logo_url: string | null;
  updated_by_id: number;
  updated_at: string;
}

interface SiteSettingsProps {}

const SiteSettings: React.FC<SiteSettingsProps> = () => {
  const dispatch = useAppDispatch();
  const { settings, isLoading, error } = useAppSelector((state) => state.siteSettings);
  const { user } = useAuth(); // Get current authenticated user
  
  const [siteTitle, setSiteTitle] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Load current settings on component mount
  useEffect(() => {
    dispatch(fetchSiteSettings());
  }, [dispatch]);

  // Update local state when settings change
  useEffect(() => {
    if (settings) {
      setSiteTitle(settings.site_title || 'Site Title');
    }
  }, [settings]);

  const validateTitle = (title: string): string | null => {
    if (!title.trim()) {
      return 'Site title cannot be empty';
    }
    if (title.length > 50) {
      return 'Site title must be 50 characters or less';
    }
    if (!/^[a-zA-Z0-9\s\-\.'":]+$/.test(title)) {
      return 'Site title contains invalid characters. Only letters, numbers, spaces, and basic punctuation (-, ., \', ", :) are allowed';
    }
    return null;
  };

  const handleTitleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = event.target.value;
    setSiteTitle(newTitle);
    setValidationError(validateTitle(newTitle));
    setSuccessMessage(null);
  };

  const handleSave = async () => {
    const titleError = validateTitle(siteTitle);
    if (titleError) {
      setValidationError(titleError);
      return;
    }

    if (!user?.id) {
      setValidationError('User not authenticated. Please log in again.');
      return;
    }

    try {
      setIsSaving(true);
      dispatch(clearError());
      setValidationError(null);
      
      const updateData = {
        site_title: siteTitle.trim(),
        site_logo_url: settings?.site_logo_url || '/favicon.png'
      };

      await dispatch(updateSiteSettings({ 
        settings: updateData, 
        userId: user.id 
      })).unwrap();
      setSuccessMessage('Site settings updated successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Failed to update site settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setSiteTitle(settings?.site_title || 'Site Title');
    setValidationError(null);
    dispatch(clearError());
    setSuccessMessage(null);
  };

  const hasChanges = siteTitle.trim() !== (settings?.site_title || 'Site Title');
  const canSave = hasChanges && !validationError && siteTitle.trim().length > 0;

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading site settings...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 800 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Site Settings
      </Typography>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Configure the appearance and branding of your site. Changes will be applied immediately.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {successMessage && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {successMessage}
        </Alert>
      )}

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Site Title
        </Typography>
        
        <TextField
          fullWidth
          label="Site Title"
          value={siteTitle}
          onChange={handleTitleChange}
          error={!!validationError}
          helperText={validationError || `${siteTitle.length}/50 characters`}
          sx={{ mb: 2 }}
          disabled={isSaving}
        />

        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <Chip 
            label="Letters & Numbers" 
            size="small" 
            variant="outlined" 
          />
          <Chip 
            label="Spaces" 
            size="small" 
            variant="outlined" 
          />
          <Chip 
            label="Basic Punctuation (- . ' &quot; :)" 
            size="small" 
            variant="outlined" 
          />
        </Box>

        <Divider sx={{ my: 2 }} />

        <Typography variant="h6" gutterBottom>
          Preview
        </Typography>
        
        <Box 
          sx={{ 
            p: 2, 
            backgroundColor: '#f8f9fa',
            border: '1px solid #e0e0e0',
            borderRadius: 1,
            mb: 2
          }}
        >
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Header Preview:
          </Typography>
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center',
              p: 1,
              backgroundColor: 'white',
              border: '1px solid #ddd',
              borderRadius: 1
            }}
          >
            <Typography variant="h6" component="span">
              {siteTitle || 'Site Title'}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          <Button
            variant="outlined"
            onClick={handleReset}
            disabled={!hasChanges || isSaving}
          >
            Reset
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!canSave || isSaving}
            startIcon={isSaving ? <CircularProgress size={20} /> : null}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </Box>
      </Paper>

      {settings && (
        <Paper sx={{ p: 2, backgroundColor: '#f5f5f5' }}>
          <Typography variant="body2" color="text.secondary">
            Last updated: {new Date(settings.updated_at).toLocaleString()}
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default SiteSettings;
