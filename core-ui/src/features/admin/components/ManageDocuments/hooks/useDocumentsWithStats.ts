// ManageDocuments/hooks/useDocumentsWithStats.ts

import { useState, useCallback } from "react";
import axios, { AxiosInstance } from "axios";
import { DocumentWithStats } from "../types";

const api: AxiosInstance = axios.create({
  baseURL: "/api/v1",
  timeout: 120000,
});

interface UseDocumentsWithStatsOptions {
  /**
   * Callback fired when fetching documents fails
   */
  onError?: (error: unknown) => void;
}

interface UseDocumentsWithStatsReturn {
  // State
  selectedCollectionId: string;
  documentsWithStats: DocumentWithStats[];
  isLoading: boolean;

  // Actions
  handleCollectionChange: (collectionId: string) => Promise<void>;
  refreshDocuments: () => Promise<void>;
  reset: () => void;
}

export const useDocumentsWithStats = (
  options: UseDocumentsWithStatsOptions = {}
): UseDocumentsWithStatsReturn => {
  const { onError } = options;

  // State
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>("");
  const [documentsWithStats, setDocumentsWithStats] = useState<DocumentWithStats[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Fetch documents with stats for a collection
  const fetchDocumentsWithStats = useCallback(
    async (collectionId: string) => {
      if (!collectionId) {
        setDocumentsWithStats([]);
        return;
      }

      setIsLoading(true);

      try {
        const response = await api.get(
          `/documents/collection/${collectionId}/with-stats`
        );
        setDocumentsWithStats(response.data);
      } catch (error) {
        console.error("Failed to fetch documents with stats:", error);
        setDocumentsWithStats([]);
        if (onError) {
          onError(error);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [onError]
  );

  // Handle collection selection change
  const handleCollectionChange = useCallback(
    async (collectionId: string) => {
      setSelectedCollectionId(collectionId);
      setDocumentsWithStats([]);
      await fetchDocumentsWithStats(collectionId);
    },
    [fetchDocumentsWithStats]
  );

  // Refresh documents for current collection (useful after deletion)
  const refreshDocuments = useCallback(async () => {
    if (selectedCollectionId) {
      await fetchDocumentsWithStats(selectedCollectionId);
    }
  }, [selectedCollectionId, fetchDocumentsWithStats]);

  // Reset all state
  const reset = useCallback(() => {
    setSelectedCollectionId("");
    setDocumentsWithStats([]);
    setIsLoading(false);
  }, []);

  return {
    // State
    selectedCollectionId,
    documentsWithStats,
    isLoading,

    // Actions
    handleCollectionChange,
    refreshDocuments,
    reset,
  };
};