import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "../index";
import axios, { AxiosInstance } from "axios";

// API client setup
const api: AxiosInstance = axios.create({
  baseURL: "/api/v1",
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
  documents: Document[]; // Documents for the currently selected collection
  allDocuments: Document[]; // All documents across all collections
  status: "idle" | "loading" | "succeeded" | "failed";
  allDocumentsStatus: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
  selectedCollectionId: number | null;
}

interface DocumentCreate {
  title: string;
  description: string;
  document_collection_id: number;
}

interface DocumentUpdate {
  title?: string;
  description?: string;
  document_collection_id?: number;
}

export type { DocumentCreate, DocumentUpdate };

// Initial state
const initialState: DocumentState = {
  documents: [],
  allDocuments: [], // Initialize empty
  status: "idle",
  allDocumentsStatus: "idle", // Initialize status
  error: null,
  selectedCollectionId: null,
};

export const fetchAllDocuments = createAsyncThunk(
  "documents/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/documents/", {
        params: {
          skip: 0,
          limit: 1000,
        },
      });

      if (!(response.status === 200)) {
        return rejectWithValue(
          `Failed to fetch all documents: ${response.statusText}`
        );
      }

      const allDocuments: Document[] = response.data;
      return allDocuments;
    } catch (error) {
      console.error("fetchAllDocuments error:", error);
      return rejectWithValue(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
);

// Alternative thunk if you need to fetch by collections
export const fetchAllDocumentsByCollections = createAsyncThunk(
  "documents/fetchAllByCollections",
  async (collectionIds: number[], { rejectWithValue }) => {
    try {
      const allDocuments: Document[] = [];

      // Fetch documents from each collection
      for (const collectionId of collectionIds) {
        const response = await api.get(
          `/collections/${collectionId}/documents`
        );
        if (response.status === 200) {
          allDocuments.push(...response.data);
        }
      }

      return allDocuments;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
);

// Existing thunk
export const fetchDocumentsByCollection = createAsyncThunk(
  "documents/fetchByCollection",
  async (collectionId: number, { rejectWithValue }) => {
    try {
      const response = await api.get(`/collections/${collectionId}/documents`);

      if (!(response.status === 200)) {
        return rejectWithValue(
          `Failed to fetch documents: ${response.statusText}`
        );
      }

      const documents: Document[] = response.data;
      return { documents, collectionId };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
);

// New thunk for creating a document
export const createDocument = createAsyncThunk(
  "documents/create",
  async (newDocument: DocumentCreate, { rejectWithValue }) => {
    try {
      const response = await api.post("/documents/", newDocument);

      if (!(response.status === 201)) {
        return rejectWithValue(
          `Failed to create document: ${response.statusText}`
        );
      }

      const createdDocument: Document = response.data;
      return createdDocument;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
);

// New thunk for updating a document
export const updateDocument = createAsyncThunk(
  "documents/update",
  async (
    { id, updates }: { id: number; updates: DocumentUpdate },
    { rejectWithValue }
  ) => {
    try {
      const response = await api.patch(`/documents/${id}`, updates);

      if (!(response.status === 200)) {
        return rejectWithValue(
          `Failed to update document: ${response.statusText}`
        );
      }

      const updatedDocument: Document = response.data;
      return updatedDocument;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
);

// Slice
const documentSlice = createSlice({
  name: "documents",
  initialState,
  reducers: {
    clearDocuments: (state) => {
      state.documents = [];
      state.status = "idle";
      state.selectedCollectionId = null;
    },
    // Clear all documents
    clearAllDocuments: (state) => {
      state.allDocuments = [];
      state.allDocumentsStatus = "idle";
    },
    setSelectedCollectionId: (state, action: PayloadAction<number | null>) => {
      state.selectedCollectionId = action.payload;
      if (action.payload === null) {
        state.documents = [];
        state.status = "idle";
      }
    },
    // Manually add documents to allDocuments (useful for when documents are loaded individually)
    addToAllDocuments: (state, action: PayloadAction<Document[]>) => {
      const newDocs = action.payload;
      // Only add documents that aren't already in allDocuments
      for (const newDoc of newDocs) {
        if (!state.allDocuments.find((doc) => doc.id === newDoc.id)) {
          state.allDocuments.push(newDoc);
        }
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Existing fetchDocumentsByCollection handlers
      .addCase(fetchDocumentsByCollection.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(
        fetchDocumentsByCollection.fulfilled,
        (
          state,
          action: PayloadAction<{ documents: Document[]; collectionId: number }>
        ) => {
          state.status = "succeeded";
          state.documents = action.payload.documents;
          state.selectedCollectionId = action.payload.collectionId;

          // Also add these documents to allDocuments
          const newDocs = action.payload.documents;
          for (const newDoc of newDocs) {
            if (!state.allDocuments.find((doc) => doc.id === newDoc.id)) {
              state.allDocuments.push(newDoc);
            }
          }
        }
      )
      .addCase(fetchDocumentsByCollection.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload as string;
      })

      // fetchAllDocuments handlers
      .addCase(fetchAllDocuments.pending, (state) => {
        state.allDocumentsStatus = "loading";
        state.error = null;
      })
      .addCase(
        fetchAllDocuments.fulfilled,
        (state, action: PayloadAction<Document[]>) => {
          state.allDocumentsStatus = "succeeded";
          state.allDocuments = action.payload;
        }
      )
      .addCase(fetchAllDocuments.rejected, (state, action) => {
        state.allDocumentsStatus = "failed";
        state.error = action.payload as string;
      })

      // fetchAllDocumentsByCollections handlers
      .addCase(fetchAllDocumentsByCollections.pending, (state) => {
        state.allDocumentsStatus = "loading";
        state.error = null;
      })
      .addCase(
        fetchAllDocumentsByCollections.fulfilled,
        (state, action: PayloadAction<Document[]>) => {
          state.allDocumentsStatus = "succeeded";
          state.allDocuments = action.payload;
        }
      )
      .addCase(fetchAllDocumentsByCollections.rejected, (state, action) => {
        state.allDocumentsStatus = "failed";
        state.error = action.payload as string;
      })

      // aje: existing createDocument handlers - updated to also add to allDocuments
      .addCase(createDocument.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(
        createDocument.fulfilled,
        (state, action: PayloadAction<Document>) => {
          state.status = "succeeded";
          if (
            action.payload.document_collection_id === state.selectedCollectionId
          ) {
            state.documents.push(action.payload);
          }

          // Also add to allDocuments
          if (!state.allDocuments.find((doc) => doc.id === action.payload.id)) {
            state.allDocuments.push(action.payload);
          }
        }
      )
      .addCase(createDocument.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload as string;
      })
      .addCase(updateDocument.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(
        updateDocument.fulfilled,
        (state, action: PayloadAction<Document>) => {
          state.status = "succeeded";
          // Update the document in the array
          const index = state.documents.findIndex(
            (d) => d.id === action.payload.id
          );
          if (index !== -1) {
            state.documents[index] = action.payload;
          }
        }
      )
      .addCase(updateDocument.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload as string;
      });
  },
});

// Export actions
export const {
  clearDocuments,
  clearAllDocuments,
  setSelectedCollectionId,
  addToAllDocuments,
} = documentSlice.actions;

// Export selectors
export const selectAllDocuments = (state: RootState) =>
  state.documents.allDocuments;
export const selectCollectionDocuments = (state: RootState) =>
  state.documents.documents; // Get documents for current collection
export const selectDocumentsStatus = (state: RootState) =>
  state.documents.status;
export const selectAllDocumentsStatus = (state: RootState) =>
  state.documents.allDocumentsStatus;
export const selectDocumentsError = (state: RootState) => state.documents.error;
export const selectSelectedCollectionId = (state: RootState) =>
  state.documents.selectedCollectionId;

// Get a specific document by ID from allDocuments
export const selectDocumentById = (state: RootState, documentId: number) =>
  state.documents.allDocuments.find((doc) => doc.id === documentId);

export default documentSlice.reducer;
