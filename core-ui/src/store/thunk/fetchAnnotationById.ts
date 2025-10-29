// src/store/thunk/fetchAnnotationById.ts

import { createAsyncThunk } from '@reduxjs/toolkit';
import { Annotation } from '@documentView/types';
import { RootState } from '@store';
import axios, { AxiosInstance } from 'axios';

const api: AxiosInstance = axios.create({
  baseURL: '/api/v1',
  timeout: 10000,
});

/**
 * Standalone thunk for fetching a single annotation by ID
 * Does not modify any slice state - just returns the annotation
 */
export const fetchAnnotationById = createAsyncThunk<
  Annotation,
  string, // annotationId
  { state: RootState }
>(
  'annotations/fetchById',
  async (annotationId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/annotations/${annotationId}`);
      
      if (response.status !== 200) {
        return rejectWithValue(`Failed to fetch annotation: ${response.statusText}`);
      }
      
      return response.data as Annotation;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);