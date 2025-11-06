import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';

// Types
export interface AttributeMapping {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name?: string;
}

export interface CASConfiguration {
  id: number | null;
  enabled: boolean;
  server_url: string | null;
  validation_endpoint: string;
  protocol_version: string;
  xml_namespace: string;
  attribute_mapping: AttributeMapping;
  username_patterns: string[];
  metadata_attributes: string[];
  email_domain: string | null;
  email_format: 'from_cas' | 'construct';
  display_name: string;
  updated_at: string | null;
  updated_by_id: number | null;
}

export interface CASConfigUpdate {
  enabled: boolean;
  server_url?: string | null;
  validation_endpoint: string;
  protocol_version: string;
  xml_namespace: string;
  attribute_mapping?: AttributeMapping;
  username_patterns: string[];
  metadata_attributes: string[];
  email_domain?: string | null;
  email_format: 'from_cas' | 'construct';
  display_name: string;
}

interface CASConfigState {
  config: CASConfiguration | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: CASConfigState = {
  config: null,
  isLoading: false,
  error: null,
};

// Async thunks
export const fetchCASConfig = createAsyncThunk(
  'casConfig/fetch',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get('/api/v1/cas-config');
      return response.data;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.detail || 'Failed to fetch CAS configuration'
      );
    }
  }
);

export const updateCASConfig = createAsyncThunk(
  'casConfig/update',
  async (config: CASConfigUpdate, { rejectWithValue }) => {
    try {
      const response = await axios.put('/api/v1/cas-config', config);
      return response.data;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.detail || 'Failed to update CAS configuration'
      );
    }
  }
);

// Slice
const casConfigSlice = createSlice({
  name: 'casConfig',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch CAS Config
      .addCase(fetchCASConfig.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCASConfig.fulfilled, (state, action: PayloadAction<CASConfiguration>) => {
        state.isLoading = false;
        state.config = action.payload;
        state.error = null;
      })
      .addCase(fetchCASConfig.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Update CAS Config
      .addCase(updateCASConfig.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateCASConfig.fulfilled, (state, action: PayloadAction<CASConfiguration>) => {
        state.isLoading = false;
        state.config = action.payload;
        state.error = null;
      })
      .addCase(updateCASConfig.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError } = casConfigSlice.actions;
export default casConfigSlice.reducer;