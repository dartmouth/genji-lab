import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

export interface SiteSettings {
  id: number;
  site_title: string;
  site_logo_url: string | null;
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
      settings: { site_title: string; site_logo_url?: string | null }, 
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
          site_logo_url: '/favicon.png',
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
      });
  },
});

export const { clearError, resetSiteSettings } = siteSettingsSlice.actions;
export default siteSettingsSlice.reducer;
