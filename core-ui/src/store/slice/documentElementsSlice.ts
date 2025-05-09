import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../index';
import axios from 'axios';

// API client setup
const api = axios.create({
  baseURL: '/api/v1',
  timeout: 10000,
});

// Types
export interface DocumentElement {
  id: number;
  content: {
    text: string;
  };
  document_id: number;
}

interface DocumentElementsState {
  // Normalized state structure for multiple documents
  elementsByDocumentId: {
    [documentId: number]: DocumentElement[];
  };
  // Track loading state for each document
  documentStatus: {
    [documentId: number]: 'idle' | 'loading' | 'succeeded' | 'failed';
  };
  // Track errors for each document
  documentErrors: {
    [documentId: number]: string | null;
  };
  // Primary document being viewed
  currentDocumentId: number | null;
}

// Initial state
const initialState: DocumentElementsState = {
  elementsByDocumentId: {},
  documentStatus: {},
  documentErrors: {},
  currentDocumentId: null
};

// Thunk for fetching elements for any document
export const fetchDocumentElements = createAsyncThunk(
  'documentElements/fetchElements',
  async (documentId: number, { rejectWithValue }) => {
    try {
      const response = await api.get(`/documents/${documentId}/elements/`);
      
      if (!(response.status === 200)) {
        return rejectWithValue(`Failed to fetch document elements: ${response.statusText}`);
      }
      
      const elements: DocumentElement[] = response.data;
      return { elements, documentId };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

// Slice
const documentElementsSlice = createSlice({
  name: 'documentElements',
  initialState,
  reducers: {
    clearElements: (state, action: PayloadAction<number | undefined>) => {
      // If documentId provided, clear just that document
      if (action.payload !== undefined) {
        const documentId = action.payload;
        delete state.elementsByDocumentId[documentId];
        delete state.documentStatus[documentId];
        delete state.documentErrors[documentId];
        
        // If it's the current document, clear that too
        if (state.currentDocumentId === documentId) {
          state.currentDocumentId = null;
        }
      } else {
        // Clear everything
        state.elementsByDocumentId = {};
        state.documentStatus = {};
        state.documentErrors = {};
        state.currentDocumentId = null;
      }
    },
    setCurrentDocumentId: (state, action: PayloadAction<number | null>) => {
      state.currentDocumentId = action.payload;
      
      // If setting to null, clear the elements for the current document
      if (action.payload === null && state.currentDocumentId !== null) {
        const oldDocumentId = state.currentDocumentId;
        delete state.elementsByDocumentId[oldDocumentId];
        delete state.documentStatus[oldDocumentId];
        delete state.documentErrors[oldDocumentId];
      }
    }
  },
  extraReducers: (builder) => {
    builder
      // Handle document fetch
      .addCase(fetchDocumentElements.pending, (state, action) => {
        const documentId = action.meta.arg;
        state.documentStatus[documentId] = 'loading';
        state.documentErrors[documentId] = null;
      })
      .addCase(fetchDocumentElements.fulfilled, (state, action) => {
        const { elements, documentId } = action.payload;
        state.elementsByDocumentId[documentId] = elements;
        state.documentStatus[documentId] = 'succeeded';
        
        // Set currentDocumentId only if not already set
        // This prevents comparison documents from becoming the main document
        if (state.currentDocumentId === null) {
          state.currentDocumentId = documentId;
        }
      })
      .addCase(fetchDocumentElements.rejected, (state, action) => {
        const documentId = action.meta.arg;
        state.documentStatus[documentId] = 'failed';
        state.documentErrors[documentId] = action.payload as string || 'Unknown error';
      });
  }
});

// Export actions
export const { clearElements, setCurrentDocumentId } = documentElementsSlice.actions;

// Export selectors
export const selectElementsByDocumentId = (state: RootState, documentId: number | null) => 
  documentId ? state.documentElements.elementsByDocumentId[documentId] || [] : [];

export const selectDocumentStatusById = (state: RootState, documentId: number | null) =>
  documentId ? state.documentElements.documentStatus[documentId] || 'idle' : 'idle';

export const selectDocumentErrorById = (state: RootState, documentId: number | null) =>
  documentId ? state.documentElements.documentErrors[documentId] || null : null;

export const selectCurrentDocumentId = (state: RootState) => 
  state.documentElements.currentDocumentId;

export default documentElementsSlice.reducer;