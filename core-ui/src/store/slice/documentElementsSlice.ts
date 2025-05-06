// store/slice/documentElementsSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../index';
import axios from 'axios';
import { DocumentElement } from '@/types';
// API client setup (reusing the same configuration as in documentSlice)
const api = axios.create({
  baseURL: '/api/v1',
  timeout: 10000,
});

interface DocumentElementsState {
  elements: DocumentElement[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  currentDocumentId: number | null;
}

// Initial state
const initialState: DocumentElementsState = {
  elements: [],
  status: 'idle',
  error: null,
  currentDocumentId: null
};

// Thunk
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
    clearElements: (state) => {
      state.elements = [];
      state.status = 'idle';
      state.currentDocumentId = null;
    },
    setCurrentDocumentId: (state, action: PayloadAction<number | null>) => {
      state.currentDocumentId = action.payload;
      if (action.payload === null) {
        state.elements = [];
        state.status = 'idle';
      }
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDocumentElements.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchDocumentElements.fulfilled, (state, action: PayloadAction<{elements: DocumentElement[], documentId: number}>) => {
        state.status = 'succeeded';
        state.elements = action.payload.elements;
        state.currentDocumentId = action.payload.documentId;
      })
      .addCase(fetchDocumentElements.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      });
  }
});

// Export actions
export const { clearElements, setCurrentDocumentId } = documentElementsSlice.actions;

// Export selectors
export const selectAllDocumentElements = (state: RootState) => state.documentElements.elements;
export const selectDocumentElementsStatus = (state: RootState) => state.documentElements.status;
export const selectDocumentElementsError = (state: RootState) => state.documentElements.error;
export const selectCurrentDocumentId = (state: RootState) => state.documentElements.currentDocumentId;

export default documentElementsSlice.reducer;