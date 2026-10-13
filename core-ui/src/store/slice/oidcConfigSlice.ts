import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';

// Types
export interface OIDCConfiguration {
  id: number | null;
  enabled: boolean;
  button_label: string;
  updated_at: string | null;
  updated_by_id: number | null;
}

export interface OIDCConfigUpdate {
  enabled: boolean;
  button_label: string;
}

interface OIDCConfigState {
  config: OIDCConfiguration | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: OIDCConfigState = {
  config: null,
  isLoading: false,
  error: null,
};

// Async thunks
export const fetchOIDCConfig = createAsyncThunk(
  'oidcConfig/fetch',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get('/api/v1/oidc-config');
      return response.data;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.detail || 'Failed to fetch OIDC configuration'
      );
    }
  }
);

export const updateOIDCConfig = createAsyncThunk(
  'oidcConfig/update',
  async (config: OIDCConfigUpdate, { rejectWithValue }) => {
    try {
      const response = await axios.put('/api/v1/oidc-config', config);
      return response.data;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.detail || 'Failed to update OIDC configuration'
      );
    }
  }
);

// Slice
const oidcConfigSlice = createSlice({
  name: 'oidcConfig',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch OIDC Config
      .addCase(fetchOIDCConfig.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchOIDCConfig.fulfilled, (state, action: PayloadAction<OIDCConfiguration>) => {
        state.isLoading = false;
        state.config = action.payload;
        state.error = null;
      })
      .addCase(fetchOIDCConfig.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Update OIDC Config
      .addCase(updateOIDCConfig.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateOIDCConfig.fulfilled, (state, action: PayloadAction<OIDCConfiguration>) => {
        state.isLoading = false;
        state.config = action.payload;
        state.error = null;
      })
      .addCase(updateOIDCConfig.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError } = oidcConfigSlice.actions;
export default oidcConfigSlice.reducer;
