// createAnnotationSlice.ts
import { createSlice, PayloadAction, createSelector } from '@reduxjs/toolkit';
import { Annotation } from '../types/annotation';

// Import RootState type - but we'll use a type import to avoid circular references
import type { RootState } from './index';

// The state structure for a single annotation bucket
export interface AnnotationState {
  byId: Record<string, Annotation>;
  byDocumentElement: Record<string, string[]>;
}

// The state structure for the combined annotations slice
export interface AnnotationsState {
  [bucketName: string]: AnnotationState;
}

// Factory function that creates a slice for a specific bucket
export function createAnnotationSlice(bucketName: string) {
  const initialState: AnnotationState = {
    byId: {},
    byDocumentElement: {}
  };

  const slice = createSlice({
    name: `annotations/${bucketName}`,
    initialState,
    reducers: {
      addAnnotations(state, action: PayloadAction<Annotation[]>) {
        action.payload.forEach(annotation => {
          // Add to primary index
          state.byId[annotation.id] = annotation;
          
          // Extract document element ID from target
          annotation.target.forEach(target => {
            const documentElementId = target.source;
            if (documentElementId) {
              // Initialize array if needed
              if (!state.byDocumentElement[documentElementId]) {
                state.byDocumentElement[documentElementId] = [];
              }
              // Add reference to annotation ID (avoid duplicates)
              if (!state.byDocumentElement[documentElementId].includes(annotation.id)) {
                state.byDocumentElement[documentElementId].push(annotation.id);
              }
            }
          });
        });
      },

      
      addAnnotation(state, action: PayloadAction<Annotation>) {
        const annotation = action.payload;
        
        // Add to primary index
        state.byId[annotation.id] = annotation;
        
        // Extract document element ID from target
        annotation.target.forEach(target => {
          const documentElementId = target.source;
          if (documentElementId) {
            // Initialize array if needed
            if (!state.byDocumentElement[documentElementId]) {
              state.byDocumentElement[documentElementId] = [];
            }
            // Add reference to annotation ID (avoid duplicates)
            if (!state.byDocumentElement[documentElementId].includes(annotation.id)) {
              state.byDocumentElement[documentElementId].push(annotation.id);
            }
          }
        });
      }
    }
  });

  const getBucketState = (state: RootState): AnnotationState => {
    // Access the bucket using indexed notation
    return state.annotations[bucketName] as AnnotationState;
  };

  // Create selectors specific to this bucket
  const selectAnnotationById = (state: RootState, id: string) => {
    const bucketState = getBucketState(state);
    return bucketState.byId[id];
  };

  const selectAnnotationsById = (state: RootState, ids: string[]) => {
    const bucketState = getBucketState(state);
    return ids.map(key => bucketState.byId[key]);
  };

  const selectAnnotationsByDocumentElement = (state: RootState, documentElementId: string) => {
    const bucketState = getBucketState(state);
    const annotationIds = bucketState.byDocumentElement[documentElementId] || [];
    return annotationIds.map(id => bucketState.byId[id]);
  };

  const makeSelectAnnotationsById = () => 
    createSelector(
      [
        (state: RootState) => getBucketState(state).byId, 
        (_: RootState, ids: string[]) => ids
      ],
      (byId, ids) => ids.map(key => byId[key])
    );

  return {
    name: bucketName,
    reducer: slice.reducer,
    actions: slice.actions,
    selectors: {
      selectAnnotationById,
      selectAnnotationsById,
      selectAnnotationsByDocumentElement,
      makeSelectAnnotationsById
    }
  };
}