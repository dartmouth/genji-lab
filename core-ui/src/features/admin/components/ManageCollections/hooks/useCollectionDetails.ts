// hooks/useCollectionDetails.ts
import { useState, useCallback, useEffect } from "react";
import { CollectionDetails } from "../types";

import axios, { AxiosInstance } from 'axios';

const api: AxiosInstance = axios.create({
  baseURL: '/api/v1',
  timeout: 10000,
});

export const useCollectionDetails = (collectionId: string | number | null) => {
  const [details, setDetails] = useState<CollectionDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDetails = useCallback(async (id: string | number) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get(`/collections/${id}`);
      setDetails(response.data);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (collectionId) {
      fetchDetails(collectionId);
    }
  }, [collectionId, fetchDetails]);

  return { details, isLoading, error, refetch: fetchDetails };
};