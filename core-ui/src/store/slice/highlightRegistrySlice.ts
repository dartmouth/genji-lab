// store/slice/highlightRegistrySlice.ts
import { createSlice, createSelector, PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "@store";

// Define types
export interface HighlightBoundingBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface RegisteredHighlight {
  id: string;
  motivation: string;
  boundingBoxes: HighlightBoundingBox[];
  annotationId: string;
  paragraphId?: string;
}

interface HighlightRegistryState {
  highlights: Record<number, Record<string, RegisteredHighlight>>;
  hoveredHighlightIds: Record<number, string[]>;
}

const initialState: HighlightRegistryState = {
  highlights: {},
  hoveredHighlightIds: {},
};

interface HoveredHighlightsPayload {
  documentId: number;
  highlightIds: string[];
}

// Extended payload for registerHighlight that includes documentId
interface RegisterHighlightPayload extends RegisteredHighlight {
  documentId: number;
}

// Extended payload for updateHighlightPosition that includes documentId
interface UpdateHighlightPositionPayload {
  documentId: number;
  id: string;
  boundingBoxes: HighlightBoundingBox[];
}

const highlightRegistrySlice = createSlice({
  name: "highlightRegistry",
  initialState,
  reducers: {
    registerHighlight: (
      state,
      action: PayloadAction<RegisterHighlightPayload>
    ) => {
      const { documentId, ...highlightData } = action.payload;

      // Initialize document highlights if needed
      if (!state.highlights[documentId]) {
        state.highlights[documentId] = {};
      }

      // Store the highlight
      state.highlights[documentId][highlightData.id] = highlightData;
    },

    updateHighlightPosition: (
      state,
      action: PayloadAction<UpdateHighlightPositionPayload>
    ) => {
      const { documentId, id, boundingBoxes } = action.payload;

      if (state.highlights[documentId]?.[id]) {
        state.highlights[documentId][id].boundingBoxes = boundingBoxes;
      }
    },

    removeHighlight: (
      state,
      action: PayloadAction<{ documentId: number; highlightId: string }>
    ) => {
      const { documentId, highlightId } = action.payload;
      if (state.highlights[documentId]) {
        delete state.highlights[documentId][highlightId];
      }
    },

    // Keep this exactly as-is - already works correctly!
    setHoveredHighlights: (
      state,
      action: PayloadAction<HoveredHighlightsPayload>
    ) => {
      if (!state.hoveredHighlightIds[action.payload.documentId]) {
        state.hoveredHighlightIds[action.payload.documentId] = [];
      }
      state.hoveredHighlightIds[action.payload.documentId] =
        action.payload.highlightIds;
    },

    // Clear all highlights for a document (useful when navigating away)
    clearDocumentHighlights: (state, action: PayloadAction<number>) => {
      const documentId = action.payload;
      delete state.highlights[documentId];
      delete state.hoveredHighlightIds[documentId];
    },
  },
});

// Selector to get all highlights for a specific document
export const selectDocumentHighlights = createSelector(
  [
    (state: RootState) => state.highlightRegistry.highlights,
    (_state: RootState, documentId: number) => documentId,
  ],
  (highlights, documentId) => highlights[documentId] || {}
);

// Selector to get hovered highlight IDs for a document
export const selectHoveredHighlightIds = createSelector(
  [
    (state: RootState) => state.highlightRegistry.hoveredHighlightIds,
    (_state: RootState, documentId: number) => documentId,
  ],
  (hoveredHighlightIds, documentId) => hoveredHighlightIds[documentId] || []
);

// Selector to get a specific highlight by ID
export const selectHighlightById = createSelector(
  [
    (state: RootState) => state.highlightRegistry.highlights,
    (_state: RootState, documentId: number, highlightId: string) => ({
      documentId,
      highlightId,
    }),
  ],
  (highlights, { documentId, highlightId }) =>
    highlights[documentId]?.[highlightId] || null
);

export const {
  registerHighlight,
  updateHighlightPosition,
  removeHighlight,
  setHoveredHighlights,
  clearDocumentHighlights,
} = highlightRegistrySlice.actions;

export default highlightRegistrySlice.reducer;
