// createAnnotationSlice.ts
import {
  createSlice,
  PayloadAction,
  createSelector,
  AsyncThunk,
  Selector,
  Reducer,
} from "@reduxjs/toolkit";

import {
  Annotation,
  AnnotationDelete,
  AnnotationCreate,
  AnnotationPatch,
  AnnotationAddTarget,
  TextTarget,
  ObjectTarget,
} from "@documentView/types";

import {
  createFetchAnnotationsThunk,
  createSaveAnnotationThunk,
  createPatchAnnotationThunk,
  createDeleteAnnotationThunk,
  createAddTargetThunk,
  createRemoveTargetThunk,
} from "@store/thunk/factory/createAnnotationThunks";
import type { RootState } from "@store/index";

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
    deleteAnnotation: (
      annotationDelete: AnnotationDelete
    ) => PayloadAction<AnnotationDelete>;
  };
  thunks: {
    fetchAnnotations: AsyncThunk<
      Annotation[],
      { documentElementId: string; classroomId?: string },
      { state: RootState }
    >;
    saveAnnotation: AsyncThunk<
      Annotation,
      { annotation: AnnotationCreate; classroomId?: string },
      { state: RootState }
    >;
    patchAnnotation: AsyncThunk<
      Annotation,
      AnnotationPatch,
      { state: RootState }
    >;
    deleteAnnotation: AsyncThunk<
      AnnotationDelete,
      AnnotationDelete,
      { state: RootState }
    >;
    removeTarget: AsyncThunk<
      Annotation | null,
      { annotationId: number; targetId: number },
      { state: RootState }
    >;
  };
  selectors: {
    selectAnnotationById: (
      state: RootState,
      id: string
    ) => Annotation | undefined;
    selectAnnotationsById: (
      state: RootState,
      ids: string[]
    ) => (Annotation | undefined)[];
    selectAllAnnotations: (state: RootState) => Annotation[];
    selectAnnotationsByParent: (
      state: RootState,
      documentElementId: string
    ) => Annotation[];
    makeSelectAnnotationsById: () => Selector<
      RootState,
      Annotation[],
      [string[]]
    >;
    makeSelectAnnotationsByParent: () => Selector<
      RootState,
      Annotation[],
      [string]
    >;
  };
};

export type AnnotationSliceMap = {
  [key: string]: AnnotationSlice;
};

// The state structure for the combined annotations slice
export interface AnnotationsState {
  [bucketName: string]: AnnotationState;
}

const flattenTargets = (
  targets:
    | (TextTarget | ObjectTarget | (TextTarget | ObjectTarget)[])[]
    | null
    | undefined
): (TextTarget | ObjectTarget)[] => {
  if (!targets) return [];

  return targets.flatMap((target) =>
    Array.isArray(target) ? target : [target]
  );
};
// Factory function that creates a slice for a specific bucket
export function createAnnotationSlice(bucketName: string) {
  const initialState: AnnotationState = {
    byId: {},
    byParent: {},
    loading: false,
    error: null,
  };

  const slice = createSlice({
    name: `annotations/${bucketName}`,
    initialState,
    reducers: {
      addAnnotations(state, action: PayloadAction<Annotation[]>) {
        action.payload.forEach((annotation) => {
          // Add to primary index
          state.byId[annotation.id] = annotation;

          // Extract document element ID from target
          flattenTargets(annotation.target).forEach((target) => {
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
        flattenTargets(annotation.target).forEach((target) => {
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
        const stringId = String(annotationId);

        // Get the annotation to be deleted
        const annotation = state.byId[stringId];

        if (annotation) {
          // Remove from byId index first
          delete state.byId[stringId];

          // Remove from byParent indexes
          flattenTargets(annotation.target).forEach((target) => {
            const sourceId = target.source;
            if (sourceId && state.byParent[sourceId]) {
              // Filter out the annotation ID from the array
              state.byParent[sourceId] = state.byParent[sourceId].filter(
                (id) => id !== stringId
              );

              // Clean up empty arrays to prevent memory leaks
              if (state.byParent[sourceId].length === 0) {
                delete state.byParent[sourceId];
              }
            }
          });

          // This handles edge cases where the annotation might be referenced elsewhere
          Object.keys(state.byParent).forEach((parentId) => {
            state.byParent[parentId] = state.byParent[parentId].filter(
              (id) => id !== stringId
            );
            // Clean up empty arrays
            if (state.byParent[parentId].length === 0) {
              delete state.byParent[parentId];
            }
          });
        }
      },
      clearAnnotations(state) {
        state.byId = {};
        state.byParent = {};
        state.error = null;
      },
      addTargetToAnnotation(state, action: PayloadAction<AnnotationAddTarget>) {
        const { annotationId, target } = action.payload;
        const stringId = String(annotationId);
        const annotation = state.byId[stringId];

        if (!annotation) {
          console.error(`Annotation ${annotationId} not found`);
          return;
        }

        // Add new targets to the annotation
        annotation.target.push(...target);

        // Update byParent index for each new target
        target.forEach((newTarget) => {
          const sourceId = String(newTarget.source);

          if (sourceId) {
            // Initialize array if needed
            if (!state.byParent[sourceId]) {
              state.byParent[sourceId] = [];
            }

            // Add reference to annotation ID (avoid duplicates)
            if (!state.byParent[sourceId].includes(stringId)) {
              state.byParent[sourceId].push(stringId);
            }
          }
        });
      },
    },
  });

  const thunks = {
    fetchAnnotations: createFetchAnnotationsThunk(bucketName, slice.actions),
    saveAnnotation: createSaveAnnotationThunk(bucketName, slice.actions),
    patchAnnotation: createPatchAnnotationThunk(bucketName, slice.actions),
    deleteAnnotation: createDeleteAnnotationThunk(bucketName, slice.actions),
    addTarget: createAddTargetThunk(bucketName, slice.actions),
    removeTarget: createRemoveTargetThunk(bucketName, slice.actions),
  };

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
    // Filter out undefined values to prevent crashes
    return ids
      .map((key) => bucketState.byId?.[key])
      .filter(
        (annotation): annotation is Annotation => annotation !== undefined
      );
  };

  const selectAllAnnotations = (state: RootState) => {
    const bucketState = getBucketState(state);
    const ids = Object.keys(bucketState.byId);
    // Filter out undefined values
    return ids
      .map((key) => bucketState.byId[key])
      .filter(
        (annotation): annotation is Annotation => annotation !== undefined
      );
  };

  const makeSelectAnnotationsByParent = () =>
    createSelector(
      [
        getBucketState,
        (_: RootState, documentElementId: string) => documentElementId,
      ],
      (bucketState, documentElementId) => {
        const annotationIds = bucketState.byParent[documentElementId] || [];
        // Filter out undefined annotations to prevent crashes
        return annotationIds
          .map((id) => bucketState.byId[id])
          .filter(
            (annotation): annotation is Annotation => annotation !== undefined
          );
      }
    );

  const selectAnnotationsByParent = createSelector(
    [
      getBucketState,
      (_: RootState, documentElementId: string) => documentElementId,
    ],
    (bucketState, documentElementId) => {
      const annotationIds = bucketState.byParent[documentElementId] || [];

      return annotationIds
        .map((id) => bucketState.byId[id])
        .filter(
          (annotation): annotation is Annotation => annotation !== undefined
        );
    }
  );

  const makeSelectAnnotationsById = () =>
    createSelector(
      [
        (state: RootState) => getBucketState(state).byId,
        (_: RootState, ids: string[]) => ids,
      ],
      (byId, ids) => {
        if (!byId || !ids || ids.length === 0) return [];

        const results = ids
          .map((key) => byId[key])
          .filter(
            (annotation): annotation is Annotation => annotation !== undefined
          );
        return results;
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
      makeSelectAnnotationsByParent,
    },
  };
}
