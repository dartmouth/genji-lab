// src/store/thunk/annotationsByMotivation.ts

import { createAsyncThunk } from "@reduxjs/toolkit";
import { sliceMap } from "@store";
import { Annotation } from "@documentView/types";
import axios, { AxiosInstance } from "axios";

interface AnnotationsByMotivation {
  [motivation: string]: Annotation[];
}

const api: AxiosInstance = axios.create({
  baseURL: "/api/v1",
  timeout: 10000,
});

// Add request interceptor to include auth token if available
api.interceptors.request.use(
  (config) => {
    // Try to get token from localStorage
    const token =
      localStorage.getItem("access_token") ||
      sessionStorage.getItem("access_token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

interface FetchAnnotationParams {
  documentElementId: number;
  classroomID?: number;
}

export const fetchAnnotationByMotivation = createAsyncThunk(
  "annotations/fetchByDocumentElement",
  async (
    { documentElementId, classroomID }: FetchAnnotationParams,
    { dispatch }
  ) => {
    const params: Record<string, number> = {};
    if (classroomID !== undefined) {
      params.classroom_id = classroomID;
    }
    try {
      // Regular endpoint for most annotations
      const response = await api.get(
        `/annotations/by-motivation/${documentElementId}`,
        { params }
      );
      const annotationsByMotivation: AnnotationsByMotivation =
        await response.data;

      // Dispatch to Redux slices
      Object.entries(annotationsByMotivation).forEach(
        ([motivation, annotations]) => {
          if (sliceMap[motivation]) {
            dispatch(sliceMap[motivation].actions.addAnnotations(annotations));
          } else if (motivation !== "external_reference") {
            // Skip warning for external_reference since we fetch those separately
            console.warn(`No slice defined for motivation: ${motivation}`);
          }
        }
      );

      return annotationsByMotivation;
    } catch (error) {
      // Handle 401 Unauthorized gracefully for unauthenticated users
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        console.log(
          `No authenticated access for element ${documentElementId} - showing public content only`
        );
        // Return empty annotations instead of throwing error
        // This allows unauthenticated users to view documents without annotations
        return {};
      }

      // For other errors, log and rethrow
      console.error("Error fetching annotations:", error);
      throw error;
    }
  }
);
