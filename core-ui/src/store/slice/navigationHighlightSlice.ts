// store/slice/navigationHighlightSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '@store';

interface NavigationHighlightState {
  activeHighlights: {
    [elementURI: string]: {
      type: 'source' | 'target';
      timestamp: number;
      sessionId: string;
    };
  };
  currentSession: string | null;
}

const initialState: NavigationHighlightState = {
  activeHighlights: {},
  currentSession: null,
};

const navigationHighlightSlice = createSlice({
  name: 'navigationHighlight',
  initialState,
  reducers: {
    startNavigationSession: (state, action: PayloadAction<{ sessionId: string }>) => {
      state.currentSession = action.payload.sessionId;
      state.activeHighlights = {};
    },
    
    addNavigationHighlight: (state, action: PayloadAction<{
      elementURI: string;
      type: 'source' | 'target';
      sessionId: string;
    }>) => {
      const { elementURI, type, sessionId } = action.payload;
      
      const normalizedURI = elementURI.startsWith('/') ? elementURI.substring(1) : elementURI;
      
      state.activeHighlights[normalizedURI] = {
        type,
        timestamp: Date.now(),
        sessionId,
      };
      
      if (normalizedURI !== elementURI) {
        state.activeHighlights[elementURI] = {
          type,
          timestamp: Date.now(),
          sessionId,
        };
      }
    },
    
    removeNavigationHighlight: (state, action: PayloadAction<{ elementURI: string }>) => {
      const normalizedURI = action.payload.elementURI.startsWith('/') 
        ? action.payload.elementURI.substring(1) 
        : action.payload.elementURI;
      
      delete state.activeHighlights[normalizedURI];
      delete state.activeHighlights[action.payload.elementURI];
    },
    
    clearNavigationSession: (state, action: PayloadAction<{ sessionId: string }>) => {
      Object.keys(state.activeHighlights).forEach(uri => {
        if (state.activeHighlights[uri].sessionId === action.payload.sessionId) {
          delete state.activeHighlights[uri];
        }
      });
      
      if (state.currentSession === action.payload.sessionId) {
        state.currentSession = null;
      }
    },
    
    clearAllNavigationHighlights: (state) => {
      state.activeHighlights = {};
      state.currentSession = null;
    },
  },
});

export const {
  startNavigationSession,
  addNavigationHighlight,
  removeNavigationHighlight,
  clearNavigationSession,
  clearAllNavigationHighlights,
} = navigationHighlightSlice.actions;

// Selectors
export const selectNavigationHighlights = (state: RootState) => 
  state.navigationHighlight.activeHighlights;

export const selectIsElementHighlighted = (elementURI: string) => (state: RootState) => {
  const normalizedURI = elementURI.startsWith('/') ? elementURI.substring(1) : elementURI;
  const originalURI = elementURI.startsWith('/') ? elementURI : `/${elementURI}`;
  
  return elementURI in state.navigationHighlight.activeHighlights ||
         normalizedURI in state.navigationHighlight.activeHighlights ||
         originalURI in state.navigationHighlight.activeHighlights;
};

export const selectHighlightType = (elementURI: string) => (state: RootState) => {
  const normalizedURI = elementURI.startsWith('/') ? elementURI.substring(1) : elementURI;
  return state.navigationHighlight.activeHighlights[elementURI]?.type ||
         state.navigationHighlight.activeHighlights[normalizedURI]?.type ||
         null;
};

export const selectCurrentNavigationSession = (state: RootState) => 
  state.navigationHighlight.currentSession;

export default navigationHighlightSlice.reducer;