import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../index';
import axios, { AxiosInstance } from 'axios';

// API client setup
const api: AxiosInstance = axios.create({
  baseURL: '/api/v1',
  timeout: 10000,
});

// Types
export interface Document {
  id: number;
  title: string;
  description: string;
  created: string;
  modified: string;
  document_collection_id: number;
}

interface DocumentState {
  documents: Document[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  selectedCollectionId: number | null;
}

// Initial state
const initialState: DocumentState = {
  documents: [],
  status: 'idle',
  error: null,
  selectedCollectionId: null
};

// Thunks
export const fetchDocumentsByCollection = createAsyncThunk(
  'documents/fetchByCollection',
  async (collectionId: number, { rejectWithValue }) => {
    try {
      const response = await api.get(`/collections/${collectionId}/documents`);
      
      if (!(response.status === 200)) {
        return rejectWithValue(`Failed to fetch documents: ${response.statusText}`);
      }
      
      const documents: Document[] = response.data;
      return { documents, collectionId };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

// Slice
const documentSlice = createSlice({
  name: 'documents',
  initialState,
  reducers: {
    clearDocuments: (state) => {
      state.documents = [];
      state.status = 'idle';
      state.selectedCollectionId = null;
    },
    setSelectedCollectionId: (state, action: PayloadAction<number | null>) => {
      state.selectedCollectionId = action.payload;
      if (action.payload === null) {
        state.documents = [];
        state.status = 'idle';
      }
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDocumentsByCollection.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchDocumentsByCollection.fulfilled, (state, action: PayloadAction<{documents: Document[], collectionId: number}>) => {
        state.status = 'succeeded';
        state.documents = action.payload.documents;
        state.selectedCollectionId = action.payload.collectionId;
      })
      .addCase(fetchDocumentsByCollection.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      });
  }
});

// Export actions
export const { clearDocuments, setSelectedCollectionId } = documentSlice.actions;

// Export selectors
export const selectAllDocuments = (state: RootState) => state.documents.documents;
export const selectDocumentsStatus = (state: RootState) => state.documents.status;
export const selectDocumentsError = (state: RootState) => state.documents.error;
export const selectSelectedCollectionId = (state: RootState) => state.documents.selectedCollectionId;

export default documentSlice.reducer;