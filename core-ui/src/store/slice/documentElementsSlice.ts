// src/store/slice/documentElementsSlice.ts

import {
  createSlice,
  createAsyncThunk,
  PayloadAction,
  createSelector,
} from "@reduxjs/toolkit";
import { RootState } from "../index";
import axios from "axios";

import { DocumentElement } from "@/types";

// API client setup (reusing the same configuration as in documentSlice)
const api = axios.create({
  baseURL: "/api/v1",
  timeout: 10000,
});

interface DocumentElementsState {
  // Normalized state structure for multiple documents
  elementsByDocumentId: {
    [documentId: number]: DocumentElement[];
  };
  // Track loading state for each document
  documentStatus: {
    [documentId: number]: "idle" | "loading" | "succeeded" | "failed";
  };
  // Track errors for each document
  documentErrors: {
    [documentId: number]: string | null;
  };
  // Primary document being viewed
  currentDocumentId: number | null;
  // Bulk loading status
  bulkLoadingStatus: "idle" | "loading" | "succeeded" | "failed";
}

// Type for the bulk API response
interface BulkDocumentResponse {
  documents: Array<{
    document: {
      id: number;
      title: string;
      document_collection_id: number;
    };
    elements: DocumentElement[];
  }>;
  summary: {
    total_documents: number;
    total_elements: number;
    documents_with_elements: number;
    empty_documents: number;
  };
}

// Initial state
const initialState: DocumentElementsState = {
  elementsByDocumentId: {},
  documentStatus: {},
  documentErrors: {},
  currentDocumentId: null,
  bulkLoadingStatus: "idle",
};

// Thunk for fetching elements for any document
export const fetchDocumentElements = createAsyncThunk(
  "documentElements/fetchElements",
  async (documentId: number, { rejectWithValue }) => {
    try {
      const response = await api.get(`/documents/${documentId}/elements/`);

      if (!(response.status === 200)) {
        return rejectWithValue(
          `Failed to fetch document elements: ${response.statusText}`
        );
      }

      const elements: DocumentElement[] = response.data;
      return { elements, documentId };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
);

export const fetchAllDocumentElements = createAsyncThunk<
  BulkDocumentResponse,
  void,
  { rejectValue: string }
>("documentElements/fetchAllElements", async (_, { rejectWithValue }) => {
  try {
    const response = await api.get("/elements/bulk/bulk-with-documents");

    if (!(response.status === 200)) {
      return rejectWithValue(
        `Failed to fetch all document elements: ${response.statusText}`
      );
    }

    return response.data as BulkDocumentResponse;
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : "Unknown error"
    );
  }
});

// Slice
const documentElementsSlice = createSlice({
  name: "documentElements",
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
    },
  },
  extraReducers: (builder) => {
    builder
      // Handle document fetch
      .addCase(fetchDocumentElements.pending, (state, action) => {
        const documentId = action.meta.arg;
        state.documentStatus[documentId] = "loading";
        state.documentErrors[documentId] = null;
      })
      .addCase(fetchDocumentElements.fulfilled, (state, action) => {
        const { elements, documentId } = action.payload;
        state.elementsByDocumentId[documentId] = elements;
        state.documentStatus[documentId] = "succeeded";

        // Set currentDocumentId only if not already set
        // This prevents comparison documents from becoming the main document
        if (state.currentDocumentId === null) {
          state.currentDocumentId = documentId;
        }
      })
      .addCase(fetchDocumentElements.rejected, (state, action) => {
        const documentId = action.meta.arg;
        state.documentStatus[documentId] = "failed";
        state.documentErrors[documentId] =
          (action.payload as string) || "Unknown error";
      })
      // Handle bulk document fetch
      .addCase(fetchAllDocumentElements.pending, (state) => {
        state.bulkLoadingStatus = "loading";
      })
      .addCase(fetchAllDocumentElements.fulfilled, (state, action) => {
        // Clear existing data
        state.elementsByDocumentId = {};
        state.documentStatus = {};
        state.documentErrors = {};

        // Populate with all documents and elements
        action.payload.documents.forEach((docData) => {
          const documentId = docData.document.id;
          state.elementsByDocumentId[documentId] = docData.elements;
          state.documentStatus[documentId] = "succeeded";
          state.documentErrors[documentId] = null;
        });

        // Set first document as current if none set
        if (
          state.currentDocumentId === null &&
          action.payload.documents.length > 0
        ) {
          state.currentDocumentId = action.payload.documents[0].document.id;
        }

        state.bulkLoadingStatus = "succeeded";
        console.log(
          `Bulk loaded ${action.payload.summary.total_elements} elements from ${action.payload.summary.total_documents} documents`
        );
      })
      .addCase(fetchAllDocumentElements.rejected, (state, action) => {
        state.bulkLoadingStatus = "failed";
        console.error("Bulk loading failed:", action.payload);
      });
  },
});

// Export actions
export const { clearElements, setCurrentDocumentId } =
  documentElementsSlice.actions;

// ============================================================================
// 🎯 MEMOIZED SELECTORS - These replace the old plain function selectors
// ============================================================================

// Base selector to get the entire documentElements state
const selectDocumentElementsState = (state: RootState) =>
  state.documentElements;

// Memoized selector for elements by document ID
export const selectElementsByDocumentId = createSelector(
  [
    selectDocumentElementsState,
    (_state: RootState, documentId: number | null) => documentId,
  ],
  (documentElementsState, documentId) => {
    if (!documentId) return [];
    return documentElementsState.elementsByDocumentId[documentId] || [];
  }
);

// Memoized selector for document status by ID
export const selectDocumentStatusById = createSelector(
  [
    selectDocumentElementsState,
    (_state: RootState, documentId: number | null) => documentId,
  ],
  (
    documentElementsState,
    documentId
  ): "idle" | "loading" | "succeeded" | "failed" => {
    if (!documentId) return "idle";
    return documentElementsState.documentStatus[documentId] || "idle";
  }
);

// Memoized selector for document error by ID
export const selectDocumentErrorById = createSelector(
  [
    selectDocumentElementsState,
    (_state: RootState, documentId: number | null) => documentId,
  ],
  (documentElementsState, documentId) => {
    if (!documentId) return null;
    return documentElementsState.documentErrors[documentId] || null;
  }
);

// Memoized selector for current document ID
export const selectCurrentDocumentId = createSelector(
  [selectDocumentElementsState],
  (documentElementsState) => documentElementsState.currentDocumentId
);

// Memoized selector for bulk loading status
export const selectBulkLoadingStatus = createSelector(
  [selectDocumentElementsState],
  (documentElementsState) => documentElementsState.bulkLoadingStatus
);

export default documentElementsSlice.reducer;
