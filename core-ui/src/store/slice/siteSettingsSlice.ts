import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

import axios, {AxiosInstance} from "axios";
const api: AxiosInstance = axios.create({
    baseURL: '/api/v1',
    timeout: 10000,
  });

export interface SiteSettings {
  id: number;
  site_title: string;
  site_logo_enabled: boolean;
  updated_by_id: number;
  updated_at: string;
}

export interface SiteSettingsState {
  settings: SiteSettings | null;
  isLoading: boolean;
  error: string | null;
  lastFetched: number | null;
}

const initialState: SiteSettingsState = {
  settings: null,
  isLoading: false,
  error: null,
  lastFetched: null,
};

// Async thunks
export const fetchSiteSettings = createAsyncThunk(
  'siteSettings/fetchSiteSettings',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/site-settings/');
      return response.data;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

export const updateSiteSettings = createAsyncThunk(
  'siteSettings/updateSiteSettings',
  async (
    { settings, userId }: { 
      settings: { site_title: string; site_logo_enabled?: boolean }, 
      userId: number 
    }, 
    { rejectWithValue }
  ) => {
    try {
      const response = await api.put('/site-settings/', settings, {
        headers: {
          'X-User-ID': userId.toString(),
        },
        withCredentials: true,
      });
      
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to update site settings';
      return rejectWithValue(errorMessage);
    }
  }
);

export const uploadSiteLogo = createAsyncThunk(
  'siteSettings/uploadSiteLogo',
  async (
    { file, userId }: { file: File; userId: number }, 
    { rejectWithValue }
  ) => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/site-settings/upload-logo', formData, {
        headers: {
          'X-User-ID': userId.toString(),
        },
        withCredentials: true,
      });
      
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to upload logo';
      return rejectWithValue(errorMessage);
    }
  }
);

export const removeSiteLogo = createAsyncThunk(
  'siteSettings/removeSiteLogo',
  async (userId: number, { rejectWithValue }) => {
    try {
      const response = await api.delete('/site-settings/remove-logo', {
        headers: {
          'X-User-ID': userId.toString(),
        },
        withCredentials: true,
      });
      
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to remove logo';
      return rejectWithValue(errorMessage);
    }
  }
);

export const getCacheBuster = createAsyncThunk(
  'siteSettings/getCacheBuster',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/site-settings/cache-buster');
      return response.data.timestamp;
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to get cache buster';
      return rejectWithValue(errorMessage);
    }
  }
);

export const uploadSiteFavicon = createAsyncThunk(
  'siteSettings/uploadSiteFavicon',
  async (
    { file, userId }: { file: File; userId: number }, 
    { rejectWithValue }
  ) => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/site-settings/upload-favicon', formData, {
        headers: {
          'X-User-ID': userId.toString(),
        },
        withCredentials: true,
      });
      
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to upload favicon';
      return rejectWithValue(errorMessage);
    }
  }
);

export const removeSiteFavicon = createAsyncThunk(
  'siteSettings/removeSiteFavicon',
  async (userId: number, { rejectWithValue }) => {
    try {
      const response = await api.delete('/site-settings/remove-favicon', {
        headers: {
          'X-User-ID': userId.toString(),
        },
        withCredentials: true,
      });
      
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to remove favicon';
      return rejectWithValue(errorMessage);
    }
  }
);

const siteSettingsSlice = createSlice({
  name: 'siteSettings',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    resetSiteSettings: (state) => {
      state.settings = null;
      state.error = null;
      state.lastFetched = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch site settings
      .addCase(fetchSiteSettings.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchSiteSettings.fulfilled, (state, action: PayloadAction<SiteSettings>) => {
        state.isLoading = false;
        state.settings = action.payload;
        state.lastFetched = Date.now();
        state.error = null;
      })
      .addCase(fetchSiteSettings.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        // Set default settings on error
        state.settings = {
          id: 0,
          site_title: 'Site Title',
          site_logo_enabled: false,
          updated_by_id: 0,
          updated_at: new Date().toISOString(),
        };
      })
      // Update site settings
      .addCase(updateSiteSettings.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateSiteSettings.fulfilled, (state, action: PayloadAction<SiteSettings>) => {
        state.isLoading = false;
        state.settings = action.payload;
        state.lastFetched = Date.now();
        state.error = null;
      })
      .addCase(updateSiteSettings.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Upload logo
      .addCase(uploadSiteLogo.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(uploadSiteLogo.fulfilled, (state, action: PayloadAction<SiteSettings>) => {
        state.isLoading = false;
        state.settings = action.payload;
        state.lastFetched = Date.now();
        state.error = null;
      })
      .addCase(uploadSiteLogo.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Remove logo
      .addCase(removeSiteLogo.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(removeSiteLogo.fulfilled, (state, action: PayloadAction<SiteSettings>) => {
        state.isLoading = false;
        state.settings = action.payload;
        state.lastFetched = Date.now();
        state.error = null;
      })
      .addCase(removeSiteLogo.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Upload favicon
      .addCase(uploadSiteFavicon.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(uploadSiteFavicon.fulfilled, (state, action: PayloadAction<SiteSettings>) => {
        state.isLoading = false;
        state.settings = action.payload;
        state.lastFetched = Date.now();
        state.error = null;
      })
      .addCase(uploadSiteFavicon.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Remove favicon
      .addCase(removeSiteFavicon.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(removeSiteFavicon.fulfilled, (state, action: PayloadAction<SiteSettings>) => {
        state.isLoading = false;
        state.settings = action.payload;
        state.lastFetched = Date.now();
        state.error = null;
      })
      .addCase(removeSiteFavicon.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, resetSiteSettings } = siteSettingsSlice.actions;
export default siteSettingsSlice.reducer;
