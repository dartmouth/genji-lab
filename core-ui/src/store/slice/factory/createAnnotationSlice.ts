// createAnnotationSlice.ts
import { createSlice, PayloadAction, createSelector } from '@reduxjs/toolkit';
import { Annotation } from '../../../types/annotation';

// Import RootState type - but we'll use a type import to avoid circular references
import type { RootState } from '../../index';

// The state structure for a single annotation bucket
export interface AnnotationState {
  byId: Record<string, Annotation>;
  byParent: Record<string, string[]>;
}

// The state structure for the combined annotations slice
export interface AnnotationsState {
  [bucketName: string]: AnnotationState;
}

// Factory function that creates a slice for a specific bucket
export function createAnnotationSlice(bucketName: string) {
  const initialState: AnnotationState = {
    byId: {},
    byParent: {}
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
              if (!state.byParent[documentElementId]) {
                state.byParent[documentElementId] = [];
              }
              // Add reference to annotation ID (avoid duplicates)
              if (!state.byParent[documentElementId].includes(annotation.id)) {
                state.byParent[documentElementId].push(annotation.id);
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
            if (!state.byParent[documentElementId]) {
              state.byParent[documentElementId] = [];
            }
            // Add reference to annotation ID (avoid duplicates)
            if (!state.byParent[documentElementId].includes(annotation.id)) {
              state.byParent[documentElementId].push(annotation.id);
            }
          }
        });
      }
    }
  });

  const getBucketState = (state: RootState): AnnotationState => {
    return state.annotations[bucketName] as AnnotationState;
  };

  // Create selectors specific to this bucket
  const selectAnnotationById = (state: RootState, id: string) => {
    const bucketState = getBucketState(state);
    return bucketState.byId[id];
  };

  const selectAnnotationsById = (state: RootState, ids: string[]) => {
    const bucketState = getBucketState(state);
    return ids.map(key => bucketState.byId?.[key]);
  };

  const selectAllAnnotations = (state: RootState) => {
    const bucketState = getBucketState(state);
    const ids = Object.keys(bucketState.byId)
    return ids.map(key => bucketState.byId[key]);
  };

   const makeSelectAnnotationsByParent= () => 
    createSelector(
      [
        getBucketState,
        (_: RootState, documentElementId: string) => documentElementId
      ],
      (bucketState, documentElementId) => {
        const annotationIds = bucketState.byParent[documentElementId];
        return annotationIds.map(id => bucketState.byId[id]);
      }
    );
  
  const selectAnnotationsByParent= createSelector(
    [
        getBucketState,
        (_: RootState, documentElementId: string) => documentElementId
      ],
      (bucketState, documentElementId) => {
        // console.log("In selector, id is", documentElementId)
        const annotationIds = bucketState.byParent[documentElementId] || [];
        return annotationIds.map(id => bucketState.byId[id]);
      }
  );

  const makeSelectAnnotationsById = () => 
    createSelector(
      [
        (state: RootState) => getBucketState(state).byId, 
        (_: RootState, ids: string[]) => ids
      ],
      (byId, ids) => {
        if (!byId || !ids || ids.length === 0) return [];
        
        const results = ids.map(key => byId[key]).filter(Boolean);
        return results.length > 0 ? results : [];
      }
    );
    

  return {
    name: bucketName,
    reducer: slice.reducer,
    actions: slice.actions,
    selectors: {
      selectAnnotationById,
      selectAnnotationsById,
      selectAllAnnotations,
      selectAnnotationsByParent,
      makeSelectAnnotationsById,
      makeSelectAnnotationsByParent
    }
  };
}