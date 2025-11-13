
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Switch,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Radio,
  RadioGroup,
  FormControl,
  FormLabel,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Select,
  InputLabel,
  Paper,
  Stack,
} from '@mui/material';
import { ExpandMore, Delete, Add } from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '@store/hooks';
import {
  fetchCASConfig,
  updateCASConfig,
  clearError,
//   AttributeMapping,
  CASConfigUpdate,
} from '@store/slice/casConfigSlice';
import { useAuth } from '@hooks/useAuthContext';

const CASAuthSettings: React.FC = () => {
  const dispatch = useAppDispatch();
  const { config, isLoading, error } = useAppSelector((state) => state.casConfig);
  const { user } = useAuth();

  // Form state
  const [enabled, setEnabled] = useState<boolean>(false);
  const [serverUrl, setServerUrl] = useState<string>('');
  const [validationEndpoint, setValidationEndpoint] = useState<string>('/serviceValidate');
  const [protocolVersion, setProtocolVersion] = useState<string>('2.0');
  const [xmlNamespace, setXmlNamespace] = useState<string>('http://www.yale.edu/tp/cas');
  const [displayName, setDisplayName] = useState<string>('CAS Login');

  // Attribute mapping state
  const [usernameAttr, setUsernameAttr] = useState<string>('netid');
  const [emailAttr, setEmailAttr] = useState<string>('email');
  const [firstNameAttr, setFirstNameAttr] = useState<string>('givenName');
  const [lastNameAttr, setLastNameAttr] = useState<string>('sn');
  const [fullNameAttr, setFullNameAttr] = useState<string>('name');

  // Username patterns state
  const [usernamePatterns, setUsernamePatterns] = useState<string[]>([
    '<cas:attribute name="{attr}" value="([^"]+)"',
    '<cas:{attr}>([^<]+)</cas:{attr}>',
    '<cas:user>([^<]+)</cas:user>'
  ]);

  // Metadata attributes state
  const [metadataAttributes, setMetadataAttributes] = useState<string[]>(['uid', 'netid', 'did', 'affil']);
  const [newMetadataAttr, setNewMetadataAttr] = useState<string>('');

  // Email configuration state
  const [emailFormat, setEmailFormat] = useState<'from_cas' | 'construct'>('from_cas');
  const [emailDomain, setEmailDomain] = useState<string>('');

  // UI state
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [showDisableDialog, setShowDisableDialog] = useState<boolean>(false);
  const [disableConfirmText, setDisableConfirmText] = useState<string>('');

  // Load configuration on mount
  useEffect(() => {
    dispatch(fetchCASConfig());
  }, [dispatch]);

  // Update form state when config loads
  useEffect(() => {
    if (config) {
      setEnabled(config.enabled);
      setServerUrl(config.server_url || '');
      setValidationEndpoint(config.validation_endpoint);
      setProtocolVersion(config.protocol_version);
      setXmlNamespace(config.xml_namespace);
      setDisplayName(config.display_name);

      // Attribute mapping
      setUsernameAttr(config.attribute_mapping.username);
      setEmailAttr(config.attribute_mapping.email);
      setFirstNameAttr(config.attribute_mapping.first_name);
      setLastNameAttr(config.attribute_mapping.last_name);
      setFullNameAttr(config.attribute_mapping.full_name || 'name');

      // Patterns and metadata
      setUsernamePatterns(config.username_patterns);
      setMetadataAttributes(config.metadata_attributes);

      // Email config
      setEmailFormat(config.email_format);
      setEmailDomain(config.email_domain || '');
    }
  }, [config]);

  // Validation functions
  const validateServerUrl = (url: string): string | null => {
    if (enabled && !url) {
      return 'Server URL is required when CAS is enabled';
    }
    if (url && !url.match(/^https?:\/\/.+/)) {
      return 'Server URL must start with http:// or https://';
    }
    return null;
  };

  const validateRequired = (value: string, fieldName: string): string | null => {
    if (enabled && !value.trim()) {
      return `${fieldName} is required when CAS is enabled`;
    }
    return null;
  };

  const validatePattern = (pattern: string): string | null => {
    if (!pattern.includes('{attr}')) {
      return 'Pattern must contain {attr} placeholder';
    }
    return null;
  };

  const validateEmailDomain = (): string | null => {
    if (emailFormat === 'construct' && !emailDomain.trim()) {
      return 'Email domain is required when constructing emails';
    }
    return null;
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Only validate if CAS is being enabled
    if (enabled) {
      const serverUrlError = validateServerUrl(serverUrl);
      if (serverUrlError) errors.serverUrl = serverUrlError;

      const usernameError = validateRequired(usernameAttr, 'Username attribute');
      if (usernameError) errors.usernameAttr = usernameError;

      const emailError = validateRequired(emailAttr, 'Email attribute');
      if (emailError) errors.emailAttr = emailError;

      const firstNameError = validateRequired(firstNameAttr, 'First name attribute');
      if (firstNameError) errors.firstNameAttr = firstNameError;

      const lastNameError = validateRequired(lastNameAttr, 'Last name attribute');
      if (lastNameError) errors.lastNameAttr = lastNameError;

      const emailDomainError = validateEmailDomain();
      if (emailDomainError) errors.emailDomain = emailDomainError;

      // Validate patterns
      usernamePatterns.forEach((pattern, index) => {
        const patternError = validatePattern(pattern);
        if (patternError) errors[`pattern_${index}`] = patternError;
      });
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle enable/disable toggle
  const handleEnabledToggle = () => {
    if (enabled) {
      // Trying to disable - show confirmation dialog
      setShowDisableDialog(true);
    } else {
      // Enabling - just toggle
      setEnabled(true);
    }
  };

  const handleDisableConfirm = () => {
    if (disableConfirmText.toLowerCase() === 'disable') {
      setEnabled(false);
      setShowDisableDialog(false);
      setDisableConfirmText('');
    }
  };

  const handleDisableCancel = () => {
    setShowDisableDialog(false);
    setDisableConfirmText('');
  };

  // Pattern management
  const handleAddPattern = () => {
    setUsernamePatterns([...usernamePatterns, '']);
  };

  const handleRemovePattern = (index: number) => {
    setUsernamePatterns(usernamePatterns.filter((_, i) => i !== index));
  };

  const handlePatternChange = (index: number, value: string) => {
    const newPatterns = [...usernamePatterns];
    newPatterns[index] = value;
    setUsernamePatterns(newPatterns);
  };

  // Metadata attribute management
  const handleAddMetadataAttr = () => {
    if (newMetadataAttr.trim() && !metadataAttributes.includes(newMetadataAttr.trim())) {
      setMetadataAttributes([...metadataAttributes, newMetadataAttr.trim()]);
      setNewMetadataAttr('');
    }
  };

  const handleRemoveMetadataAttr = (attr: string) => {
    setMetadataAttributes(metadataAttributes.filter(a => a !== attr));
  };

  // Save configuration
  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    if (!user?.id) {
      setValidationErrors({ general: 'User not authenticated. Please log in again.' });
      return;
    }

    try {
      setIsSaving(true);
      dispatch(clearError());
      setValidationErrors({});

      const configUpdate: CASConfigUpdate = {
        enabled,
        server_url: serverUrl.trim() || null,
        validation_endpoint: validationEndpoint,
        protocol_version: protocolVersion,
        xml_namespace: xmlNamespace,
        attribute_mapping: {
          username: usernameAttr,
          email: emailAttr,
          first_name: firstNameAttr,
          last_name: lastNameAttr,
          full_name: fullNameAttr,
        },
        username_patterns: usernamePatterns.filter(p => p.trim()),
        metadata_attributes: metadataAttributes,
        email_domain: emailDomain.trim() || null,
        email_format: emailFormat,
        display_name: displayName,
      };

      await dispatch(updateCASConfig(configUpdate)).unwrap();
      setSuccessMessage('CAS configuration saved successfully!');

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error('Failed to save CAS configuration:', err);
      setValidationErrors({ general: err || 'Failed to save configuration' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (config) {
      setEnabled(config.enabled);
      setServerUrl(config.server_url || '');
      setValidationEndpoint(config.validation_endpoint);
      setProtocolVersion(config.protocol_version);
      setXmlNamespace(config.xml_namespace);
      setDisplayName(config.display_name);
      setUsernameAttr(config.attribute_mapping.username);
      setEmailAttr(config.attribute_mapping.email);
      setFirstNameAttr(config.attribute_mapping.first_name);
      setLastNameAttr(config.attribute_mapping.last_name);
      setFullNameAttr(config.attribute_mapping.full_name || 'name');
      setUsernamePatterns(config.username_patterns);
      setMetadataAttributes(config.metadata_attributes);
      setEmailFormat(config.email_format);
      setEmailDomain(config.email_domain || '');
    }
    setValidationErrors({});
    dispatch(clearError());
    setSuccessMessage(null);
  };

  const hasChanges = config && (
    enabled !== config.enabled ||
    serverUrl !== (config.server_url || '') ||
    validationEndpoint !== config.validation_endpoint ||
    protocolVersion !== config.protocol_version ||
    xmlNamespace !== config.xml_namespace ||
    displayName !== config.display_name ||
    usernameAttr !== config.attribute_mapping.username ||
    emailAttr !== config.attribute_mapping.email ||
    firstNameAttr !== config.attribute_mapping.first_name ||
    lastNameAttr !== config.attribute_mapping.last_name ||
    fullNameAttr !== (config.attribute_mapping.full_name || 'name') ||
    JSON.stringify(usernamePatterns) !== JSON.stringify(config.username_patterns) ||
    JSON.stringify(metadataAttributes) !== JSON.stringify(config.metadata_attributes) ||
    emailFormat !== config.email_format ||
    emailDomain !== (config.email_domain || '')
  );

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading CAS configuration...</Typography>
      </Box>
    );
  }

  const showDetailedSettings = enabled || (config && config.id !== null);

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        CAS Authentication
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Configure Central Authentication Service (CAS) for your institution.
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

      {validationErrors.general && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {validationErrors.general}
        </Alert>
      )}

      {/* Status Section - Always Visible */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom fontWeight="bold">
          Status
        </Typography>

        <FormControlLabel
          control={
            <Switch
              checked={enabled}
              onChange={handleEnabledToggle}
              disabled={isSaving}
            />
          }
          label={enabled ? 'CAS Authentication Enabled' : 'CAS Authentication Disabled'}
        />

        {enabled && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            CAS authentication is enabled. Users will be able to log in using your CAS server.
          </Alert>
        )}

        <TextField
          fullWidth
          label="Display Name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          helperText="Text shown on the CAS login button"
          sx={{ mt: 2 }}
          disabled={isSaving}
        />
      </Paper>

      {/* Show detailed settings only if CAS is enabled and configured */}
      {showDetailedSettings && (
        <>
          {/* Basic CAS Settings */}
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="subtitle1" fontWeight="bold">
                Basic CAS Settings
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2}>
                <TextField
                  fullWidth
                  required
                  label="Server URL"
                  value={serverUrl}
                  onChange={(e) => setServerUrl(e.target.value)}
                  error={!!validationErrors.serverUrl}
                  helperText={validationErrors.serverUrl || 'e.g., https://login.dartmouth.edu/cas'}
                  disabled={isSaving}
                />

                <TextField
                  fullWidth
                  label="Validation Endpoint"
                  value={validationEndpoint}
                  onChange={(e) => setValidationEndpoint(e.target.value)}
                  helperText="Endpoint for ticket validation (default: /serviceValidate)"
                  disabled={isSaving}
                />

                <FormControl fullWidth sx={{ mt: 2 }}>
                  <InputLabel>Protocol Version</InputLabel>
                  <Select
                    value={protocolVersion}
                    onChange={(e) => setProtocolVersion(e.target.value)}
                    label="Protocol Version"
                    disabled={isSaving}
                  >
                    <MenuItem value="2.0">CAS 2.0</MenuItem>
                    <MenuItem value="3.0">CAS 3.0</MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  fullWidth
                  label="XML Namespace"
                  value={xmlNamespace}
                  onChange={(e) => setXmlNamespace(e.target.value)}
                  helperText="Default namespace for CAS XML responses"
                  sx={{ mt: 2 }}
                  disabled={isSaving}
                />
              </Stack>
            </AccordionDetails>
          </Accordion>

          {/* Attribute Mapping */}
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="subtitle1" fontWeight="bold">
                Attribute Mapping
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2}>
                <Typography variant="body2" color="text.secondary">
                  Map CAS response attributes to user profile fields
                </Typography>

                <TextField
                  fullWidth
                  required
                  label="Username Attribute"
                  value={usernameAttr}
                  onChange={(e) => setUsernameAttr(e.target.value)}
                  error={!!validationErrors.usernameAttr}
                  helperText={validationErrors.usernameAttr || 'CAS attribute for username (e.g., netid)'}
                  disabled={isSaving}
                />

                <TextField
                  fullWidth
                  required
                  label="Email Attribute"
                  value={emailAttr}
                  onChange={(e) => setEmailAttr(e.target.value)}
                  error={!!validationErrors.emailAttr}
                  helperText={validationErrors.emailAttr || 'CAS attribute for email'}
                  disabled={isSaving}
                />

                <TextField
                  fullWidth
                  required
                  label="First Name Attribute"
                  value={firstNameAttr}
                  onChange={(e) => setFirstNameAttr(e.target.value)}
                  error={!!validationErrors.firstNameAttr}
                  helperText={validationErrors.firstNameAttr || 'CAS attribute for first name (e.g., givenName)'}
                  disabled={isSaving}
                />

                <TextField
                  fullWidth
                  required
                  label="Last Name Attribute"
                  value={lastNameAttr}
                  onChange={(e) => setLastNameAttr(e.target.value)}
                  error={!!validationErrors.lastNameAttr}
                  helperText={validationErrors.lastNameAttr || 'CAS attribute for last name (e.g., sn)'}
                  disabled={isSaving}
                />

                <TextField
                  fullWidth
                  label="Full Name Attribute"
                  value={fullNameAttr}
                  onChange={(e) => setFullNameAttr(e.target.value)}
                  helperText="CAS attribute for full name (optional)"
                  disabled={isSaving}
                />
              </Stack>
            </AccordionDetails>
          </Accordion>

          {/* Username Extraction Patterns */}
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="subtitle1" fontWeight="bold">
                Username Extraction Patterns
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2}>
                <Alert severity="info">
                  Patterns are tried in order. Use <code>{'{attr}'}</code> as a placeholder for the attribute name.
                </Alert>

                {usernamePatterns.map((pattern, index) => (
                  <Box key={index} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                    <TextField
                      fullWidth
                      label={`Pattern ${index + 1}`}
                      value={pattern}
                      onChange={(e) => handlePatternChange(index, e.target.value)}
                      error={!!validationErrors[`pattern_${index}`]}
                      helperText={validationErrors[`pattern_${index}`]}
                      disabled={isSaving}
                      multiline
                      rows={2}
                    />
                    <IconButton
                      color="error"
                      onClick={() => handleRemovePattern(index)}
                      disabled={isSaving || usernamePatterns.length === 1}
                      sx={{ mt: 1 }}
                    >
                      <Delete />
                    </IconButton>
                  </Box>
                ))}

                <Button
                  variant="outlined"
                  startIcon={<Add />}
                  onClick={handleAddPattern}
                  disabled={isSaving}
                >
                  Add Pattern
                </Button>
              </Stack>
            </AccordionDetails>
          </Accordion>

          {/* Metadata Attributes */}
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="subtitle1" fontWeight="bold">
                Metadata Attributes
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2}>
                <Typography variant="body2" color="text.secondary">
                  Additional CAS attributes to extract and store in user metadata
                </Typography>

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                  {metadataAttributes.map((attr) => (
                    <Chip
                      key={attr}
                      label={attr}
                      onDelete={() => handleRemoveMetadataAttr(attr)}
                      disabled={isSaving}
                    />
                  ))}
                </Box>

                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    fullWidth
                    label="New Attribute"
                    value={newMetadataAttr}
                    onChange={(e) => setNewMetadataAttr(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddMetadataAttr();
                      }
                    }}
                    disabled={isSaving}
                    placeholder="e.g., uid, department"
                  />
                  <Button
                    variant="outlined"
                    startIcon={<Add />}
                    onClick={handleAddMetadataAttr}
                    disabled={isSaving || !newMetadataAttr.trim()}
                  >
                    Add
                  </Button>
                </Box>
              </Stack>
            </AccordionDetails>
          </Accordion>

          {/* Email Configuration */}
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="subtitle1" fontWeight="bold">
                Email Configuration
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2}>
                <FormControl component="fieldset">
                  <FormLabel component="legend">Email Format</FormLabel>
                  <RadioGroup
                    value={emailFormat}
                    onChange={(e) => setEmailFormat(e.target.value as 'from_cas' | 'construct')}
                  >
                    <FormControlLabel
                      value="from_cas"
                      control={<Radio />}
                      label="Extract from CAS response"
                      disabled={isSaving}
                    />
                    <FormControlLabel
                      value="construct"
                      control={<Radio />}
                      label="Construct from username and domain"
                      disabled={isSaving}
                    />
                  </RadioGroup>
                </FormControl>

                {emailFormat === 'construct' && (
                  <TextField
                    fullWidth
                    required
                    label="Email Domain"
                    value={emailDomain}
                    onChange={(e) => setEmailDomain(e.target.value)}
                    error={!!validationErrors.emailDomain}
                    helperText={validationErrors.emailDomain || 'e.g., dartmouth.edu'}
                    disabled={isSaving}
                    placeholder="example.edu"
                  />
                )}
              </Stack>
            </AccordionDetails>
          </Accordion>

          {/* Action Buttons */}
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
              disabled={!hasChanges || isSaving}
              startIcon={isSaving ? <CircularProgress size={20} /> : null}
            >
              {isSaving ? 'Saving...' : 'Save Configuration'}
            </Button>
          </Box>
        </>
      )}

      {/* Disable Confirmation Dialog */}
      <Dialog open={showDisableDialog} onClose={handleDisableCancel}>
        <DialogTitle>Disable CAS Authentication</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Disabling CAS will prevent users who created accounts via CAS from logging in.
          </Alert>
          <Typography variant="body2" sx={{ mb: 2 }}>
            To confirm, please type <strong>disable</strong> below:
          </Typography>
          <TextField
            fullWidth
            value={disableConfirmText}
            onChange={(e) => setDisableConfirmText(e.target.value)}
            placeholder="Type 'disable' to confirm"
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDisableCancel}>Cancel</Button>
          <Button
            onClick={handleDisableConfirm}
            color="error"
            variant="contained"
            disabled={disableConfirmText.toLowerCase() !== 'disable'}
          >
            Disable CAS
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CASAuthSettings;