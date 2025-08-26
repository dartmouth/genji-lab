import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

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
      const response = await fetch('/api/v1/site-settings/');
      if (!response.ok) {
        throw new Error('Failed to fetch site settings');
      }
      const data = await response.json();
      return data;
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
      const response = await fetch('/api/v1/site-settings/', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': userId.toString(), // Send user ID in header
        },
        body: JSON.stringify(settings),
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to update site settings' }));
        throw new Error(errorData.detail || 'Failed to update site settings');
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
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

      const response = await fetch('/api/v1/site-settings/upload-logo', {
        method: 'POST',
        headers: {
          'X-User-ID': userId.toString(),
        },
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to upload logo' }));
        throw new Error(errorData.detail || 'Failed to upload logo');
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

export const removeSiteLogo = createAsyncThunk(
  'siteSettings/removeSiteLogo',
  async (userId: number, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/v1/site-settings/remove-logo', {
        method: 'DELETE',
        headers: {
          'X-User-ID': userId.toString(),
        },
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to remove logo' }));
        throw new Error(errorData.detail || 'Failed to remove logo');
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

export const getCacheBuster = createAsyncThunk(
  'siteSettings/getCacheBuster',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/v1/site-settings/cache-buster');
      
      if (!response.ok) {
        return rejectWithValue('Failed to get cache buster');
      }
      
      const data = await response.json();
      return data.timestamp;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
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
      });
  },
});

export const { clearError, resetSiteSettings } = siteSettingsSlice.actions;
export default siteSettingsSlice.reducer;
