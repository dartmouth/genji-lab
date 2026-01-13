import { createAsyncThunk, ActionCreatorWithPayload } from "@reduxjs/toolkit";
import {
  Annotation,
  AnnotationCreate,
  AnnotationDelete,
  AnnotationPatch,
  AnnotationAddTarget,
} from "@documentView/types";
import { RootState } from "@store";
import axios, { AxiosInstance } from "axios";

const api: AxiosInstance = axios.create({
  baseURL: "/api/v1",
  timeout: 10000,
});

// Type for the slice actions that our thunks need
interface AnnotationSliceActions {
  addAnnotations: ActionCreatorWithPayload<Annotation[], string>;
  addAnnotation: ActionCreatorWithPayload<Annotation, string>;
  deleteAnnotation: ActionCreatorWithPayload<AnnotationDelete, string>;
  // Add other action creators as needed
}

/**
 * Creates a thunk for fetching annotations by motivation (bucket)
 */
export function createFetchAnnotationsThunk(
  bucketName: string,
  sliceActions: AnnotationSliceActions
) {
  const thunkName = `annotations/${bucketName}/fetchAnnotations`;

  return createAsyncThunk<
    Annotation[],
    { documentElementId: string; classroomId?: string },
    { state: RootState }
  >(
    thunkName,
    async (
      { documentElementId, classroomId },
      { dispatch, rejectWithValue }
    ) => {
      try {
        const params: Record<string, string | number> = {
          motivation: bucketName,
          document_element_id: documentElementId,
        };

        if (classroomId !== undefined) {
          params.classroom_id = classroomId;
        }

        const response = await api.get("/annotations/", { params });

        if (!(response.status === 200)) {
          return rejectWithValue(
            `Failed to fetch ${bucketName} annotations: ${response.statusText}`
          );
        }

        const annotations: Annotation[] = await response.data;

        dispatch(sliceActions.addAnnotations(annotations));

        return annotations;
      } catch (error) {
        return rejectWithValue(
          error instanceof Error ? error.message : "Unknown error"
        );
      }
    }
  );
}

/**
 * Creates a thunk for creating/saving a new annotation
 */
export function createSaveAnnotationThunk(
  bucketName: string,
  sliceActions: AnnotationSliceActions
) {
  const thunkName = `annotations/${bucketName}/saveAnnotation`;

  return createAsyncThunk<
    Annotation,
    { annotation: AnnotationCreate; classroomId?: string },
    { state: RootState }
  >(
    thunkName,
    async ({ annotation, classroomId }, { dispatch, rejectWithValue }) => {
      try {
        const params: Record<string, string> = {};

        if (classroomId !== undefined) {
          params.classroom_id = classroomId;
        }

        // Use your API client
        const response = await api.post(`/annotations/`, annotation, {
          params,
        });

        const savedAnnotation: Annotation = response.data;

        dispatch(sliceActions.addAnnotation(savedAnnotation));

        return savedAnnotation;
      } catch (error) {
        return rejectWithValue(
          error instanceof Error ? error.message : "Unknown error"
        );
      }
    }
  );
}

export function createPatchAnnotationThunk(
  bucketName: string,
  sliceActions: AnnotationSliceActions
) {
  const thunkName = `annotations/${bucketName}/patchAnnotation`;

  return createAsyncThunk<Annotation, AnnotationPatch, { state: RootState }>(
    thunkName,
    async (patch: AnnotationPatch, { dispatch, rejectWithValue }) => {
      try {
        // Use your API client
        const response = await api.patch(
          `/annotations/${patch.annotationId}`,
          patch.payload
        );

        const savedAnnotation: Annotation = response.data;

        dispatch(sliceActions.addAnnotation(savedAnnotation));

        return savedAnnotation;
      } catch (error) {
        return rejectWithValue(
          error instanceof Error ? error.message : "Unknown error"
        );
      }
    }
  );
}
//FINDME
export function createAddTargetThunk(
  bucketName: string,
  sliceActions: AnnotationSliceActions
) {
  const thunkName = `annotations/${bucketName}/addTarget`;

  return createAsyncThunk<
    Annotation,
    AnnotationAddTarget,
    { state: RootState }
  >(
    thunkName,
    async (patch: AnnotationAddTarget, { dispatch, rejectWithValue }) => {
      try {
        const newTarg = { target: patch.target };
        const response = await api.patch(
          `/annotations/add-target/${patch.annotationId}`,
          newTarg
        );

        const savedAnnotation: Annotation = response.data;

        dispatch(sliceActions.addAnnotation(savedAnnotation));

        return savedAnnotation;
      } catch (error) {
        return rejectWithValue(
          error instanceof Error ? error.message : "Unknown error"
        );
      }
    }
  );
}

export function createRemoveTargetThunk(
  bucketName: string,
  sliceActions: AnnotationSliceActions
) {
  const thunkName = `annotations/${bucketName}/removeTarget`;

  return createAsyncThunk<
    Annotation | null, // null if annotation was deleted entirely
    { annotationId: number; targetId: number },
    { state: RootState }
  >(
    thunkName,
    async ({ annotationId, targetId }, { dispatch, rejectWithValue }) => {
      try {
        const response = await api.patch(
          `/annotations/remove-target/${annotationId}?target_id=${targetId}`
        );

        // If 204, annotation was deleted entirely (last target removed)
        if (response.status === 204) {
          dispatch(sliceActions.deleteAnnotation({ annotationId }));
          return null;
        }

        // Otherwise, update with the new annotation data
        const updatedAnnotation: Annotation = response.data;
        dispatch(sliceActions.addAnnotation(updatedAnnotation));

        return updatedAnnotation;
      } catch (error) {
        return rejectWithValue(
          error instanceof Error ? error.message : "Unknown error"
        );
      }
    }
  );
}

export function createDeleteAnnotationThunk(
  bucketName: string,
  sliceActions: AnnotationSliceActions
) {
  const thunkName = `annotations/${bucketName}/deleteAnnotation`;

  return createAsyncThunk<
    // Annotation,
    AnnotationDelete,
    AnnotationDelete,
    { state: RootState }
  >(thunkName, async (id: AnnotationDelete, { dispatch, rejectWithValue }) => {
    try {
      await api.delete(`/annotations/${id.annotationId}`);

      dispatch(sliceActions.deleteAnnotation(id));

      return id;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  });
}
