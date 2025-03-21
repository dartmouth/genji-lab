// index.ts
import { configureStore } from '@reduxjs/toolkit';
import highlightRegistryReducer from './highlightRegistrySlice';
import annotationsReducer from './annotationSlice';

const store = configureStore({
  reducer: {
    annotations: annotationsReducer,
    highlightRegistry: highlightRegistryReducer,
  },
  devTools: true
});

export { store };
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Re-export actions and selectors from annotationSlice
export { 
  addAnnotations, 
  addAnnotation,
  selectAnnotationById,
  selectAnnotationsByDocumentElement
} from './annotationSlice';