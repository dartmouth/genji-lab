import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface DocumentNavigationState {
  activeParagraphId: string | null;
}

const initialState: DocumentNavigationState = {
  activeParagraphId: null,
};

const documentNavigationSlice = createSlice({
  name: "documentNavigation",
  initialState,
  reducers: {
    setActiveParagraph: (state, action: PayloadAction<string>) => {
      state.activeParagraphId = action.payload;
    },
    clearActiveParagraph: (state) => {
      state.activeParagraphId = null;
    },
  },
});

export const { setActiveParagraph, clearActiveParagraph } =
  documentNavigationSlice.actions;

// Selectors
export const selectActiveParagraphId = (state: {
  documentNavigation: DocumentNavigationState;
}) => state.documentNavigation.activeParagraphId;

export default documentNavigationSlice.reducer;
