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
  created_by?: {
    id: number;
    first_name?: string;
    last_name?: string;
  };
  modified_by?: {
    id: number;
    first_name?: string;
    last_name?: string;
  };
}

interface DocumentCollectionState {
  collections: DocumentCollection[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

interface Hierarchy {
  chapter: number,
  paragraph: number,
}

interface DocumentCollectionCreate {
  title: string,
  visibility: string,
  text_direction: string,
  language: string,
  hierarchy: Hierarchy,
  collection_metadata: CollectionMetadata,
  created_by_id: number,
}

interface DocumentCollectionUpdate {
  title?: string;
  visibility?: string;
  text_direction?: string;
  language?: string;
  hierarchy?: Hierarchy;
  collection_metadata?: CollectionMetadata;
  modified_by_id?: number;
}

interface CollectionMetadata {
  [key: string]: string | number | boolean
}

export type {DocumentCollectionCreate, DocumentCollectionUpdate}
export type {Hierarchy}
export type {CollectionMetadata}

// Initial state
const initialState: DocumentCollectionState = {
  collections: [],
  status: 'idle',
  error: null
};

// Thunks
export const fetchDocumentCollections = createAsyncThunk(
  'documentCollections/fetchAll',
  async (params: { includeUsers?: boolean } = {}, { rejectWithValue }) => {
    try {
      const queryParams = new URLSearchParams();
      if (params.includeUsers) {
        queryParams.append('include_users', 'true');
      }
      
      const url = `/collections/${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      const response = await api.get(url);
      
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

export const createDocumentCollection = createAsyncThunk(
  'documentCollections/create',
  async (newCollection: DocumentCollectionCreate, { rejectWithValue }) => {
    try {
      const response = await api.post('/collections/', newCollection);
      
      if (!(response.status === 201)) {
        return rejectWithValue(`Failed to create document collection: ${response.statusText}`);
      }
      
      const collections: DocumentCollection = response.data;
      return collections;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

export const updateDocumentCollection = createAsyncThunk(
  'documentCollections/update',
  async ({ id, updates }: { id: number; updates: DocumentCollectionUpdate }, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/collections/${id}`, updates);
      
      if (!(response.status === 200)) {
        return rejectWithValue(`Failed to update document collection: ${response.statusText}`);
      }
      
      const updatedCollection: DocumentCollection = response.data;
      return updatedCollection;
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
      })
      .addCase(createDocumentCollection.fulfilled, (state, action: PayloadAction<DocumentCollection>) => {
        state.status = 'succeeded';
        state.collections = [...state.collections, action.payload];
      })
      .addCase(updateDocumentCollection.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(updateDocumentCollection.fulfilled, (state, action: PayloadAction<DocumentCollection>) => {
        state.status = 'succeeded';
        // Update the collection in the array
        const index = state.collections.findIndex(c => c.id === action.payload.id);
        if (index !== -1) {
          state.collections[index] = action.payload;
        }
      })
      .addCase(updateDocumentCollection.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      ;
  }
});

// Export actions
export const { clearCollections } = documentCollectionSlice.actions;

// Export selectors
export const selectAllDocumentCollections = (state: RootState) => state.documentCollections.collections;
export const selectDocumentCollectionsStatus = (state: RootState) => state.documentCollections.status;
export const selectDocumentCollectionsError = (state: RootState) => state.documentCollections.error;

export default documentCollectionSlice.reducer;