// store/index.ts - FIXED
import {
  configureStore,
  combineReducers,
  Reducer,
  Action,
} from "@reduxjs/toolkit";
import highlightRegistryReducer from "./slice/highlightRegistrySlice";
import createAnnotationSliceReducer from "./slice/annotationCreate";
import documentNavigationReducer from "./slice/documentNavigationSlice";
import documentElementsReducer from "./slice/documentElementsSlice";
import searchResultReducer from "./slice/searchResultsSlice";
import navigationHighlightReducer from "./slice/navigationHighlightSlice";

import {
  commentingAnnotations,
  replyingAnnotations,
  scholarlyAnnotations,
  taggingAnnotations,
  upvoteAnnotations,
  flaggingAnnotations,
  linkingAnnotations,
} from "./slice/annotationSlices";

import documentsReducer from "./slice/documentSlice";

import { AnnotationState } from "./slice/factory/createAnnotationSlice";
import documentCollectionsReducer from "./slice/documentCollectionSlice";
import usersReducer from "./slice/usersSlice";
import rolesReducer from "./slice/rolesSlice";
import siteSettingsReducer from "./slice/siteSettingsSlice";

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
  [linkingAnnotations.name]: linkingAnnotations.reducer,
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
  documentNavigation: documentNavigationReducer,
  users: usersReducer,
  roles: rolesReducer,
  siteSettings: siteSettingsReducer,
  searchResults: searchResultReducer,
  navigationHighlight: navigationHighlightReducer,
};

// Create the store
export const store = configureStore({
  reducer: rootReducer,
  // 🎯 FIXED: Removed the incorrectly placed navigationHighlight line
  devTools: true,
});

// Define types AFTER store creation to avoid circular references
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Re-export actions and selectors
export * from "./slice";
export * from "./hooks";
export { fetchAnnotationByMotivation } from "./thunk";
export * from "./selector";
export { fetchAllDocumentElements } from "./slice/documentElementsSlice";
