// src/store/thunk/fetchAllLinkingAnnotations.ts

import { createAsyncThunk } from "@reduxjs/toolkit";
import { linkingAnnotations } from "@store";
import axios, { AxiosInstance } from "axios";

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

export const fetchAllLinkingAnnotations = createAsyncThunk(
  "annotations/fetchAllLinking",
  async (_, { dispatch }) => {
    try {
      // Fetch all linking annotations globally (bypass classroom filtering)
      const response = await api.get("/annotations/", {
        params: {
          motivation: "linking",
          limit: 1000,
        },
        headers: {
          "X-Classroom-ID": "", // Bypass classroom filtering
        },
      });

      const annotations = response.data;

      console.log(`Fetched ${annotations.length} linking annotations`);

      // Add to Redux store
      if (annotations && Array.isArray(annotations) && annotations.length > 0) {
        dispatch(linkingAnnotations.actions.addAnnotations(annotations));
      }

      return annotations;
    } catch (error) {
      console.error("Error fetching all linking annotations:", error);
      throw error;
    }
  }
);
