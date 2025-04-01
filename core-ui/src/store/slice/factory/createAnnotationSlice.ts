// createAnnotationSlice.ts
import { createSlice, PayloadAction, createSelector, AsyncThunk, Selector, Reducer } from '@reduxjs/toolkit';
import { Annotation, AnnotationDelete, AnnotationCreate, AnnotationPatch } from '@documentView/types';

import { 
  createFetchAnnotationsThunk, 
  createSaveAnnotationThunk, 
  createPatchAnnotationThunk,
  createDeleteAnnotationThunk 
} from '@store/thunk/factory/createAnnotationThunks';

// Import RootState type - but we'll use a type import to avoid circular references
import type { RootState } from '@store/index';

// The state structure for a single annotation bucket
export interface AnnotationState {
  byId: Record<string, Annotation>;
  byParent: Record<string, string[]>;
  loading: boolean;
  error: string | null;
}

export type AnnotationSlice = {
  name: string;
  reducer: Reducer<AnnotationState>;
  actions: {
    addAnnotations: (annotations: Annotation[]) => PayloadAction<Annotation[]>;
    addAnnotation: (annotation: Annotation) => PayloadAction<Annotation>;
    deleteAnnotation: (annotationDelete: AnnotationDelete) => PayloadAction<AnnotationDelete>;
  };
  thunks: {
    fetchAnnotations: AsyncThunk<Annotation[], string, { state: RootState }>;
    saveAnnotation: AsyncThunk<Annotation, AnnotationCreate, { state: RootState }>;
    patchAnnotation: AsyncThunk<Annotation, AnnotationPatch, { state: RootState }>;
    deleteAnnotation: AsyncThunk<AnnotationDelete, AnnotationDelete, { state: RootState }>;
  };
  selectors: {
    selectAnnotationById: (state: RootState, id: string) => Annotation | undefined;
    selectAnnotationsById: (state: RootState, ids: string[]) => (Annotation | undefined)[];
    selectAllAnnotations: (state: RootState) => Annotation[];
    selectAnnotationsByParent: (state: RootState, documentElementId: string) => Annotation[];
    makeSelectAnnotationsById: () => Selector<RootState, Annotation[], [string[]]>;
    makeSelectAnnotationsByParent: () => Selector<RootState, Annotation[], [string]>;
  };
};

export type AnnotationSliceMap = {
  [key: string]: AnnotationSlice;
};

// The state structure for the combined annotations slice
export interface AnnotationsState {
  [bucketName: string]: AnnotationState;
}

// Factory function that creates a slice for a specific bucket
export function createAnnotationSlice(bucketName: string) {
  const initialState: AnnotationState = {
    byId: {},
    byParent: {},
    loading: false,
    error: null
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
            const sourceId = target.source;
            if (sourceId) {
              // Initialize array if needed
              if (!state.byParent[sourceId]) {
                state.byParent[sourceId] = [];
              }
              // Add reference to annotation ID (avoid duplicates)
              if (!state.byParent[sourceId].includes(annotation.id)) {
                state.byParent[sourceId].push(annotation.id);
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
          const sourceId = target.source;
          if (sourceId) {
            // Initialize array if needed
            if (!state.byParent[sourceId]) {
              state.byParent[sourceId] = [];
            }
            // Add reference to annotation ID (avoid duplicates)
            if (!state.byParent[sourceId].includes(annotation.id)) {
              state.byParent[sourceId].push(annotation.id);
            }
          }
        });
      },
      deleteAnnotation(state, action: PayloadAction<AnnotationDelete>) {
        const { annotationId } = action.payload;
        const stringId = String(annotationId); // Convert to string since your IDs are stored as strings
        
        // Get the annotation to be deleted
        const annotation = state.byId[stringId];
        
        if (annotation) {
          // Remove from byId index
          delete state.byId[stringId];
          
          // Remove from byParent indexes
          annotation.target.forEach(target => {
            const sourceId = target.source;
            if (sourceId && state.byParent[sourceId]) {
              // Filter out the annotation ID from the array
              state.byParent[sourceId] = state.byParent[sourceId]
                .filter(id => id !== stringId);
              
            }
          });
        }
      }
    }
  });


    const thunks =  {
      fetchAnnotations: createFetchAnnotationsThunk(bucketName, slice.actions),
      saveAnnotation: createSaveAnnotationThunk(bucketName, slice.actions),
      patchAnnotation: createPatchAnnotationThunk(bucketName, slice.actions),
      deleteAnnotation: createDeleteAnnotationThunk(bucketName, slice.actions)
    }


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
    thunks,
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