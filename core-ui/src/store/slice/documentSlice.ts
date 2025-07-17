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

interface DocumentCreate {
  title: string,
  description: string,
  document_collection_id: number,
}

interface DocumentUpdate {
  title?: string;
  description?: string;
  document_collection_id?: number;
}

export type {DocumentCreate, DocumentUpdate}

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

// New thunk for creating a document
export const createDocument = createAsyncThunk(
  'documents/create',
  async (newDocument: DocumentCreate, { rejectWithValue }) => {
    try {
      const response = await api.post('/documents/', newDocument);

      if (!(response.status === 201)) {
        return rejectWithValue(`Failed to create document: ${response.statusText}`);
      }

      const createdDocument: Document = response.data;
      return createdDocument;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

// New thunk for updating a document
export const updateDocument = createAsyncThunk(
  'documents/update',
  async ({ id, updates }: { id: number; updates: DocumentUpdate }, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/documents/${id}`, updates);
      
      if (!(response.status === 200)) {
        return rejectWithValue(`Failed to update document: ${response.statusText}`);
      }
      
      const updatedDocument: Document = response.data;
      return updatedDocument;
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
      })
      // aje: added handlers for createDocument
      .addCase(createDocument.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(createDocument.fulfilled, (state, action: PayloadAction<Document>) => {
        state.status = 'succeeded';
        if (action.payload.document_collection_id === state.selectedCollectionId) {
          state.documents.push(action.payload);
        }
      })
      .addCase(createDocument.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      .addCase(updateDocument.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(updateDocument.fulfilled, (state, action: PayloadAction<Document>) => {
        state.status = 'succeeded';
        // Update the document in the array
        const index = state.documents.findIndex(d => d.id === action.payload.id);
        if (index !== -1) {
          state.documents[index] = action.payload;
        }
      })
      .addCase(updateDocument.rejected, (state, action) => {
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