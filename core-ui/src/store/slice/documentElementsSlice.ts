// store/slice/documentElementsSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../index';
import axios from 'axios';

// API client setup (reusing the same configuration as in documentSlice)
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
  // Comparison documents (could be multiple in the future)
  comparisonDocumentIds: number[];
}

// Initial state
const initialState: DocumentElementsState = {
  elementsByDocumentId: {},
  documentStatus: {},
  documentErrors: {},
  currentDocumentId: null,
  comparisonDocumentIds: []
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

// Same thunk but for comparison documents (to distinguish between main and comparison in the UI)
export const fetchComparisonDocumentElements = createAsyncThunk(
  'documentElements/fetchComparisonElements',
  async (documentId: number, { dispatch, rejectWithValue }) => {
    try {
      // First add this as a comparison document ID
      dispatch(addComparisonDocument(documentId));
      
      // Then fetch the elements (reusing the same API call logic)
      const response = await api.get(`/documents/${documentId}/elements/`);
      
      if (!(response.status === 200)) {
        return rejectWithValue(`Failed to fetch comparison document elements: ${response.statusText}`);
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
        
        // Remove from comparison documents if it's there
        state.comparisonDocumentIds = state.comparisonDocumentIds.filter(
          id => id !== documentId
        );
      } else {
        // Clear everything
        state.elementsByDocumentId = {};
        state.documentStatus = {};
        state.documentErrors = {};
        state.currentDocumentId = null;
        state.comparisonDocumentIds = [];
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
    },
    addComparisonDocument: (state, action: PayloadAction<number>) => {
      const documentId = action.payload;
      
      // Don't add if it's already in the list or if it's the current document
      if (
        state.comparisonDocumentIds.includes(documentId) || 
        state.currentDocumentId === documentId
      ) {
        return;
      }
      
      state.comparisonDocumentIds.push(documentId);
    },
    removeComparisonDocument: (state, action: PayloadAction<number>) => {
      const documentId = action.payload;
      
      // Remove from comparison documents
      state.comparisonDocumentIds = state.comparisonDocumentIds.filter(
        id => id !== documentId
      );
      
      // Also remove the elements to free up memory
      delete state.elementsByDocumentId[documentId];
      delete state.documentStatus[documentId];
      delete state.documentErrors[documentId];
    },
    clearAllComparisonDocuments: (state) => {
      // Clear all comparison documents and their data
      for (const documentId of state.comparisonDocumentIds) {
        delete state.elementsByDocumentId[documentId];
        delete state.documentStatus[documentId];
        delete state.documentErrors[documentId];
      }
      state.comparisonDocumentIds = [];
    }
  },
  extraReducers: (builder) => {
    builder
      // Handle main document fetch
      .addCase(fetchDocumentElements.pending, (state, action) => {
        const documentId = action.meta.arg;
        state.documentStatus[documentId] = 'loading';
        state.documentErrors[documentId] = null;
      })
      .addCase(fetchDocumentElements.fulfilled, (state, action) => {
        const { elements, documentId } = action.payload;
        state.elementsByDocumentId[documentId] = elements;
        state.documentStatus[documentId] = 'succeeded';
        // Only set currentDocumentId for main document fetch
        state.currentDocumentId = documentId;
      })
      .addCase(fetchDocumentElements.rejected, (state, action) => {
        const documentId = action.meta.arg;
        state.documentStatus[documentId] = 'failed';
        state.documentErrors[documentId] = action.payload as string || 'Unknown error';
      })
      
      // Handle comparison document fetch
      .addCase(fetchComparisonDocumentElements.pending, (state, action) => {
        const documentId = action.meta.arg;
        state.documentStatus[documentId] = 'loading';
        state.documentErrors[documentId] = null;
      })
      .addCase(fetchComparisonDocumentElements.fulfilled, (state, action) => {
        const { elements, documentId } = action.payload;
        state.elementsByDocumentId[documentId] = elements;
        state.documentStatus[documentId] = 'succeeded';
      })
      .addCase(fetchComparisonDocumentElements.rejected, (state, action) => {
        const documentId = action.meta.arg;
        state.documentStatus[documentId] = 'failed';
        state.documentErrors[documentId] = action.payload as string || 'Unknown error';
      });
  }
});

// Export actions
export const { 
  clearElements, 
  setCurrentDocumentId,
  addComparisonDocument,
  removeComparisonDocument,
  clearAllComparisonDocuments
} = documentElementsSlice.actions;

// Export selectors
export const selectElementsByDocumentId = (state: RootState, documentId: number | null) => 
  documentId ? state.documentElements.elementsByDocumentId[documentId] || [] : [];

export const selectDocumentStatusById = (state: RootState, documentId: number | null) =>
  documentId ? state.documentElements.documentStatus[documentId] || 'idle' : 'idle';

export const selectDocumentErrorById = (state: RootState, documentId: number | null) =>
  documentId ? state.documentElements.documentErrors[documentId] || null : null;

export const selectCurrentDocumentId = (state: RootState) => 
  state.documentElements.currentDocumentId;

export const selectComparisonDocumentIds = (state: RootState) => 
  state.documentElements.comparisonDocumentIds;

// Legacy selector for backward compatibility
export const selectAllDocumentElements = (state: RootState) => {
  const currentId = state.documentElements.currentDocumentId;
  return currentId ? state.documentElements.elementsByDocumentId[currentId] || [] : [];
};

export const selectDocumentElementsStatus = (state: RootState) => {
  const currentId = state.documentElements.currentDocumentId;
  return currentId ? state.documentElements.documentStatus[currentId] || 'idle' : 'idle';
};

export const selectDocumentElementsError = (state: RootState) => {
  const currentId = state.documentElements.currentDocumentId;
  return currentId ? state.documentElements.documentErrors[currentId] || null : null;
};

export default documentElementsSlice.reducer;