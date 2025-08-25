import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Alert,
  CircularProgress,
  Chip,
  Card,
  CardContent,
  IconButton,
  Tabs,
  Tab
} from '@mui/material';
import { CloudUpload, Delete, Image as ImageIcon } from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '@store/hooks';
import { fetchSiteSettings, updateSiteSettings, uploadSiteLogo, removeSiteLogo, clearError } from '@store/slice/siteSettingsSlice';
import { useAuth } from '@hooks/useAuthContext';

// TabPanel for the sub-tabs
interface SubTabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function SubTabPanel(props: SubTabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`site-settings-subtabpanel-${index}`}
      aria-labelledby={`site-settings-subtab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 2 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yPropsSubTab(index: number) {
  return {
    id: `site-settings-subtab-${index}`,
    'aria-controls': `site-settings-subtabpanel-${index}`,
  };
}

interface SiteSettings {
  id: number;
  site_title: string;
  site_logo_enabled: boolean;
  updated_by_id: number;
  updated_at: string;
}

interface SiteSettingsProps {}

const SiteSettings: React.FC<SiteSettingsProps> = () => {
  const dispatch = useAppDispatch();
  const { settings, isLoading, error } = useAppSelector((state) => state.siteSettings);
  const { user } = useAuth(); // Get current authenticated user
  
  // Tab state
  const [activeSubTab, setActiveSubTab] = useState<number>(0);
  
  const [siteTitle, setSiteTitle] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  
  // Logo-related state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [logoValidationError, setLogoValidationError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Tab handler
  const handleSubTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveSubTab(newValue);
  };

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

  // Logo validation and handling functions
  const validateLogoFile = (file: File): string | null => {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    const maxSize = 2 * 1024 * 1024; // 2MB

    if (!allowedTypes.includes(file.type)) {
      return 'Invalid file type. Only PNG and JPG files are allowed.';
    }

    if (file.size > maxSize) {
      return 'File too large. Maximum size is 2MB.';
    }

    return null;
  };

  const handleFileSelect = (file: File) => {
    const error = validateLogoFile(file);
    if (error) {
      setLogoValidationError(error);
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    setLogoValidationError(null);
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);

    const files = event.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleLogoUpload = async () => {
    if (!selectedFile || !user?.id) {
      return;
    }

    try {
      setIsSaving(true);
      dispatch(clearError());
      setLogoValidationError(null);

      await dispatch(uploadSiteLogo({ 
        file: selectedFile, 
        userId: user.id 
      })).unwrap();

      setSuccessMessage('Logo uploaded successfully!');
      setSelectedFile(null);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Failed to upload logo:', err);
      setLogoValidationError(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoRemove = async () => {
    if (!user?.id) {
      return;
    }

    try {
      setIsSaving(true);
      dispatch(clearError());
      setLogoValidationError(null);

      await dispatch(removeSiteLogo(user.id)).unwrap();

      setSuccessMessage('Logo removed successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Failed to remove logo:', err);
      setLogoValidationError(err);
    } finally {
      setIsSaving(false);
    }
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
        site_logo_enabled: settings?.site_logo_enabled || false
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
    <Box>
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

      <Box sx={{ display: 'flex', height: 'auto' }}>
        {/* Sub-tabs for Site Settings */}
        <Tabs
          orientation="vertical"
          variant="scrollable"
          value={activeSubTab}
          onChange={handleSubTabChange}
          aria-label="Site settings sub-tabs"
          sx={{ 
            borderRight: 1, 
            borderColor: 'divider',
            minWidth: '180px',
            '& .MuiTab-root': {
              alignItems: 'flex-start',
              textAlign: 'left',
              paddingLeft: 2
            }
          }}
        >
          <Tab label="Overview" {...a11yPropsSubTab(0)} />
          <Tab label="Site Title" {...a11yPropsSubTab(1)} />
          <Tab label="Site Logo" {...a11yPropsSubTab(2)} />
        </Tabs>
        
        {/* Sub-tab content */}
        <SubTabPanel value={activeSubTab} index={0}>
          <Typography variant="h5" component="h2" gutterBottom>
            Site Settings Overview
          </Typography>
          
          <Typography variant="body1" color="text.secondary">
            Manage your site's appearance and branding settings.
          </Typography>
        </SubTabPanel>

        <SubTabPanel value={activeSubTab} index={1}>
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

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 3 }}>
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
        </SubTabPanel>

        {/* Site Logo Tab */}
        <SubTabPanel value={activeSubTab} index={2}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" component="h2" gutterBottom>
              Site Logo
            </Typography>
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Upload a custom logo for your site. <strong>Exact dimensions required: 1200x40 pixels</strong>
              <br />
              <strong>Supported formats:</strong> PNG, JPG | <strong>Maximum size:</strong> 2MB
              <br />
              <strong>Important:</strong> Logo must be exactly 1200x40 pixels to fit perfectly in the header.
              <br />
              <strong>Note:</strong> The logo will appear as a background image in the header with 40% opacity.
            </Typography>

            {logoValidationError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {logoValidationError}
              </Alert>
            )}

            {/* Current Logo Display */}
            {settings?.site_logo_enabled && (
              <Card sx={{ mb: 3, p: 2 }}>
                <CardContent>
                  <Typography variant="subtitle2" gutterBottom>
                    Current Logo
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box
                      component="img"
                      src={`/api/v1/site-settings/logo?t=${Date.now()}`}
                      alt="Current Site Logo"
                      sx={{
                        maxWidth: 200,
                        maxHeight: 100,
                        objectFit: 'contain',
                        border: '1px solid #e0e0e0',
                        borderRadius: 1,
                        p: 1
                      }}
                      onError={(e) => {
                        // If logo file doesn't exist, hide the display
                        const target = e.target as HTMLElement;
                        target.style.display = 'none';
                      }}
                    />
                    <IconButton
                      color="error"
                      onClick={handleLogoRemove}
                      disabled={isSaving}
                      title="Remove current logo"
                    >
                      <Delete />
                    </IconButton>
                  </Box>
                </CardContent>
              </Card>
            )}

            {/* Logo Upload Area */}
            <Paper
              sx={{
                p: 3,
                border: isDragOver ? '2px dashed #1976d2' : '2px dashed #e0e0e0',
                backgroundColor: isDragOver ? 'rgba(25, 118, 210, 0.04)' : 'transparent',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                mb: 3,
                textAlign: 'center'
              }}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileInputChange}
                accept=".png,.jpg,.jpeg"
                style={{ display: 'none' }}
              />
              
              <ImageIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="body1" gutterBottom>
                Drag and drop a logo file here, or click to browse
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Must be exactly 1200x40 pixels • PNG or JPG • Max 2MB
              </Typography>
              
              {selectedFile && (
                <Typography variant="body2" sx={{ mt: 2, color: 'primary.main' }}>
                  Selected: {selectedFile.name}
                </Typography>
              )}
            </Paper>

            {/* Logo Upload Actions */}
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                onClick={handleLogoUpload}
                disabled={!selectedFile || isSaving || !!logoValidationError}
                startIcon={isSaving ? <CircularProgress size={20} /> : <CloudUpload />}
              >
                {isSaving ? 'Uploading...' : 'Upload Logo'}
              </Button>
            </Box>
          </Box>
        </SubTabPanel>
      </Box>
    </Box>
  );
};

export default SiteSettings;
