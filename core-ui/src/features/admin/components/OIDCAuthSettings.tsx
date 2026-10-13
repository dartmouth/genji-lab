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
} from '@mui/material';
import { useAppDispatch, useAppSelector } from '@store/hooks';
import {
  fetchOIDCConfig,
  updateOIDCConfig,
  clearError,
  OIDCConfigUpdate,
} from '@store/slice/oidcConfigSlice';
import { useAuth } from '@hooks/useAuthContext';

const DEFAULT_BUTTON_LABEL = 'Sign in with Dartmouth';
const MAX_LABEL_LENGTH = 100;

const OIDCAuthSettings: React.FC = () => {
  const dispatch = useAppDispatch();
  const { config, isLoading, error } = useAppSelector((state) => state.oidcConfig);
  const { user } = useAuth();

  // Form state
  const [enabled, setEnabled] = useState<boolean>(false);
  const [buttonLabel, setButtonLabel] = useState<string>(DEFAULT_BUTTON_LABEL);

  // UI state
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Load configuration on mount
  useEffect(() => {
    dispatch(fetchOIDCConfig());
  }, [dispatch]);

  // Update form state when config loads
  useEffect(() => {
    if (config) {
      setEnabled(config.enabled);
      setButtonLabel(config.button_label || DEFAULT_BUTTON_LABEL);
    }
  }, [config]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    const trimmed = buttonLabel.trim();
    if (!trimmed) {
      errors.buttonLabel = 'Button label is required';
    } else if (trimmed.length > MAX_LABEL_LENGTH) {
      errors.buttonLabel = `Button label must be ${MAX_LABEL_LENGTH} characters or fewer`;
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

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

      const configUpdate: OIDCConfigUpdate = {
        enabled,
        button_label: buttonLabel.trim(),
      };

      await dispatch(updateOIDCConfig(configUpdate)).unwrap();
      setSuccessMessage('OIDC configuration saved successfully!');

      setTimeout(() => setSuccessMessage(null), 3000);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error('Failed to save OIDC configuration:', err);
      setValidationErrors({ general: err || 'Failed to save configuration' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (config) {
      setEnabled(config.enabled);
      setButtonLabel(config.button_label || DEFAULT_BUTTON_LABEL);
    } else {
      setEnabled(false);
      setButtonLabel(DEFAULT_BUTTON_LABEL);
    }
    setValidationErrors({});
    setSuccessMessage(null);
    dispatch(clearError());
  };

  if (isLoading && !config) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 600 }}>
      <Typography variant="h6" gutterBottom>
        OIDC Authentication
      </Typography>

      <Alert severity="info" sx={{ mb: 2 }}>
        OIDC also requires <code>OIDC_ENABLED=true</code> and client credentials
        configured on the server; this toggle has no effect otherwise. Connection
        settings and secrets are managed via environment variables, not here.
      </Alert>

      {successMessage && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => dispatch(clearError())}>
          {error}
        </Alert>
      )}

      {validationErrors.general && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {validationErrors.general}
        </Alert>
      )}

      <FormControlLabel
        control={
          <Switch
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            color="primary"
          />
        }
        label="Enable OIDC login"
        sx={{ mb: 2, display: 'block' }}
      />

      <TextField
        label="Button label"
        value={buttonLabel}
        onChange={(e) => setButtonLabel(e.target.value)}
        fullWidth
        required
        inputProps={{ maxLength: MAX_LABEL_LENGTH }}
        error={Boolean(validationErrors.buttonLabel)}
        helperText={
          validationErrors.buttonLabel ||
          'Text shown on the OIDC login button (max 100 characters).'
        }
        sx={{ mb: 3 }}
      />

      <Box sx={{ display: 'flex', gap: 2 }}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? <CircularProgress size={24} /> : 'Save'}
        </Button>
        <Button variant="outlined" onClick={handleReset} disabled={isSaving}>
          Reset
        </Button>
      </Box>
    </Box>
  );
};

export default OIDCAuthSettings;
