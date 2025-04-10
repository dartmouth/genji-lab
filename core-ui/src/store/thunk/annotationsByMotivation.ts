import { createAsyncThunk } from '@reduxjs/toolkit';
import { sliceMap } from '@store';
import { Annotation } from '@documentView/types';
import axios, { AxiosInstance } from 'axios';
interface AnnotationsByMotivation {
  [motivation: string]: Annotation[];
}
const api: AxiosInstance = axios.create({
  baseURL: '/api/v1',
  timeout: 10000,
});

export const fetchAnnotationByMotivation = createAsyncThunk(
  'annotations/fetchByDocumentElement',
  async (documentElementId: number, { dispatch }) => {
    try {
      // Call the new endpoint
      const response = await api.get(`/annotations/by-motivation/${documentElementId}`);
      
      if (!(response.status === 200)) {
        throw new Error('Failed to fetch annotations');
      }
      
      // Parse the response data
      const annotationsByMotivation: AnnotationsByMotivation = await response.data;
    //   console.log(annotationsByMotivation)
      
      // Iterate through each motivation group
      Object.entries(annotationsByMotivation).forEach(([motivation, annotations]) => {
        // Check if we have a slice for this motivation
        if (sliceMap[motivation]) {
          // Dispatch the annotations to the appropriate slice
        //   console.log(`slice is ${motivation}`)
          
          dispatch(sliceMap[motivation].actions.addAnnotations(annotations));
        } else {
          console.warn(`No slice defined for motivation: ${motivation}`);
        }
      });
      
      return annotationsByMotivation;
    } catch (error) {
      console.error('Error fetching annotations:', error);
      throw error;
    }
  }
);