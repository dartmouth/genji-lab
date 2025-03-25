// index.ts
import { configureStore, combineReducers, Reducer, AnyAction } from '@reduxjs/toolkit';
import highlightRegistryReducer from './highlightRegistrySlice';
import { commentingAnnotations, replyingAnnotations, scholarlyAnnotations } from './annotations';
import { AnnotationState } from './createAnnotationSlice';

// Define the structure of our annotations reducers
interface AnnotationReducers {
  [key: string]: Reducer<AnnotationState, AnyAction>;
}

// Create the annotations reducers with explicit typing
const annotationReducersMap: AnnotationReducers = {
  [commentingAnnotations.name]: commentingAnnotations.reducer,
  [replyingAnnotations.name]: replyingAnnotations.reducer,
  [scholarlyAnnotations.name]: scholarlyAnnotations.reducer
};

// Combine the reducers
const annotationsReducer = combineReducers(annotationReducersMap);

// Create the root reducer with explicit typing
const rootReducer = {
  annotations: annotationsReducer,
  highlightRegistry: highlightRegistryReducer,
};

// Create the store
export const store = configureStore({
  reducer: rootReducer,
  devTools: true
});

// Define types AFTER store creation to avoid circular references
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Re-export actions and selectors from annotation buckets
export { 
  commentingAnnotations,
  replyingAnnotations
};