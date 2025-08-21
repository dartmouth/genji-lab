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

// In annotationsByMotivation.ts, modify fetchAnnotationByMotivation:
export const fetchAnnotationByMotivation = createAsyncThunk(
  "annotations/fetchByDocumentElement",
  async (documentElementId: number, { dispatch }) => {
    try {
      // Regular endpoint for most annotations
      const response = await api.get(
        `/annotations/by-motivation/${documentElementId}`
      );
      const annotationsByMotivation: AnnotationsByMotivation =
        await response.data;

      // SPECIAL CASE: Fetch linking annotations using the new endpoint
      const linkingResponse = await api.get(
        `/annotations/links/${documentElementId}`
      );
      const linkingAnnotations = await linkingResponse.data;

      if (linkingAnnotations.length > 0) {
        annotationsByMotivation.linking = linkingAnnotations;
      }

      // Dispatch to Redux slices
      Object.entries(annotationsByMotivation).forEach(
        ([motivation, annotations]) => {
          if (sliceMap[motivation]) {
            dispatch(sliceMap[motivation].actions.addAnnotations(annotations));
          } else {
            console.warn(`No slice defined for motivation: ${motivation}`);
          }
        }
      );

      return annotationsByMotivation;
    } catch (error) {
      console.error("Error fetching annotations:", error);
      throw error;
    }
  }
);
