import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../index';
import axios, { AxiosInstance } from 'axios';

// API client setup
const api: AxiosInstance = axios.create({
  baseURL: '/api/v1',
  timeout: 10000,
});

// Types
export interface DocumentCollection {
  id: number;
  title: string;
  description: string;
  visibility: string;
  language: string;
  created: string;
  modified: string;
  document_count?: number;
}

interface DocumentCollectionState {
  collections: DocumentCollection[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

// Initial state
const initialState: DocumentCollectionState = {
  collections: [],
  status: 'idle',
  error: null
};

// Thunks
export const fetchDocumentCollections = createAsyncThunk(
  'documentCollections/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/collections/');
      
      if (!(response.status === 200)) {
        return rejectWithValue(`Failed to fetch document collections: ${response.statusText}`);
      }
      
      const collections: DocumentCollection[] = response.data;
      return collections;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

// Slice
const documentCollectionSlice = createSlice({
  name: 'documentCollections',
  initialState,
  reducers: {
    // Regular reducers go here
    clearCollections: (state) => {
      state.collections = [];
      state.status = 'idle';
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDocumentCollections.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchDocumentCollections.fulfilled, (state, action: PayloadAction<DocumentCollection[]>) => {
        state.status = 'succeeded';
        state.collections = action.payload;
      })
      .addCase(fetchDocumentCollections.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      });
  }
});

// Export actions
export const { clearCollections } = documentCollectionSlice.actions;

// Export selectors
export const selectAllDocumentCollections = (state: RootState) => state.documentCollections.collections;
export const selectDocumentCollectionsStatus = (state: RootState) => state.documentCollections.status;
export const selectDocumentCollectionsError = (state: RootState) => state.documentCollections.error;

export default documentCollectionSlice.reducer;