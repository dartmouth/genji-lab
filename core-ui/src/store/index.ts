// index.ts
import { configureStore, combineReducers, Reducer, Action } from '@reduxjs/toolkit';
import highlightRegistryReducer from './slice/highlightRegistrySlice';
import createAnnotationSliceReducer from './slice/annotationCreate'
import documentNavigationReducer from './slice/documentNavigationSlice';
import documentElementsReducer from './slice/documentElementsSlice';

import { 
  commentingAnnotations, 
  replyingAnnotations, 
  scholarlyAnnotations, 
  taggingAnnotations,
  upvoteAnnotations,
  flaggingAnnotations
} from './slice/annotationSlices';

import documentsReducer from './slice/documentSlice';

import { AnnotationState } from './slice/factory/createAnnotationSlice';
import documentCollectionsReducer from './slice/documentCollectionSlice';

// Define the structure of our annotations reducers
interface AnnotationReducers {
  [key: string]: Reducer<AnnotationState, Action>;
}

// Create the annotations reducers with explicit typing
const annotationReducersMap: AnnotationReducers = {
  [commentingAnnotations.name]: commentingAnnotations.reducer,
  [replyingAnnotations.name]: replyingAnnotations.reducer,
  [scholarlyAnnotations.name]: scholarlyAnnotations.reducer,
  [taggingAnnotations.name]: taggingAnnotations.reducer,
  [upvoteAnnotations.name]: upvoteAnnotations.reducer,
  [flaggingAnnotations.name]: flaggingAnnotations.reducer,
};

// Combine the reducers
const annotationsReducer = combineReducers(annotationReducersMap);

// Create the root reducer with explicit typing
const rootReducer = {
  annotations: annotationsReducer,
  highlightRegistry: highlightRegistryReducer,
  createAnnotation: createAnnotationSliceReducer,
  documentElements: documentElementsReducer,
  documentCollections: documentCollectionsReducer,
  documents: documentsReducer,
  documentNavigation: documentNavigationReducer
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
// export { 
//   commentingAnnotations,
//   replyingAnnotations,
//   scholarlyAnnotations,
//   taggingAnnotations
// };

export * from './slice'
export * from './hooks'
export { fetchAnnotationByMotivation} from './thunk'
export * from './selector'