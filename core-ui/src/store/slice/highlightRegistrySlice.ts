// store/highlightRegistrySlice.ts
import { createSlice, createSelector, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '@store';

// Define types
export interface HighlightBoundingBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface RegisteredHighlight {
  id: string;
  motivation: string
  boundingBoxes: HighlightBoundingBox[]; // Multiple boxes for multi-line highlights
  annotationId: string; // To link to the annotation data
}

interface HighlightRegistryState {
  highlights: Record<string, RegisteredHighlight>;
  hoveredHighlightIds: Record<string, string[]>; // Store all currently hovered highlight IDs
}

const initialState: HighlightRegistryState = {
  highlights: {},
  hoveredHighlightIds: {},
};

interface HoveredHighlightsPayload {
  documentId: number;
  highlightIds: string[];
}

const highlightRegistrySlice = createSlice({
  name: 'highlightRegistry',
  initialState,
  reducers: {
    registerHighlight: (state, action: PayloadAction<RegisteredHighlight>) => {
      state.highlights[action.payload.id] = action.payload;
    },
    updateHighlightPosition: (
      state, 
      action: PayloadAction<{ id: string; boundingBoxes: HighlightBoundingBox[] }>
    ) => {
      if (state.highlights[action.payload.id]) {
        state.highlights[action.payload.id].boundingBoxes = action.payload.boundingBoxes;
      }
    },
    removeHighlight: (state, action: PayloadAction<string>) => {
      delete state.highlights[action.payload];
    },
    setHoveredHighlights: (state, action: PayloadAction<HoveredHighlightsPayload>) => {
      // state.hoveredHighlightIds = action.payload;
      if (!state.hoveredHighlightIds[action.payload.documentId]) {
        state.hoveredHighlightIds[action.payload.documentId] = [];
      }
      state.hoveredHighlightIds[action.payload.documentId] = action.payload.highlightIds;
    },
  },
});

export const selectHoveredHighlightIds = createSelector(
  [(state: RootState) => state.highlightRegistry.hoveredHighlightIds, 
   (_state, documentId: number) => documentId],
  (hoveredHighlightIds, documentId) => hoveredHighlightIds[documentId] || []
);

export const { 
  registerHighlight, 
  updateHighlightPosition, 
  removeHighlight,
  setHoveredHighlights 
} = highlightRegistrySlice.actions;


export default highlightRegistrySlice.reducer;
