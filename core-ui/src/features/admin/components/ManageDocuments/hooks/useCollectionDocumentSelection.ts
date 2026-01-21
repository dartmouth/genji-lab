// ManageDocuments/hooks/useCollectionDocumentSelection.ts

import { useState, useCallback } from "react";
import { useAppDispatch } from "@store";
import { fetchDocumentsByCollection } from "@store";
import { DocumentBasic } from "../types";

interface UseCollectionDocumentSelectionOptions {
  /**
   * Callback fired when fetching documents fails
   */
  onError?: (error: unknown) => void;
  
  /**
   * Callback fired when a document is selected, receives the full document object
   */
  onDocumentSelect?: (document: DocumentBasic | null) => void;
}

interface UseCollectionDocumentSelectionReturn {
  // State
  selectedCollectionId: string;
  selectedDocumentId: string;
  documents: DocumentBasic[];
  isLoadingDocuments: boolean;
  
  // Actions
  handleCollectionChange: (collectionId: string) => Promise<void>;
  handleDocumentChange: (documentId: string) => void;
  getSelectedDocument: () => DocumentBasic | null;
  reset: () => void;
}

export const useCollectionDocumentSelection = (
  options: UseCollectionDocumentSelectionOptions = {}
): UseCollectionDocumentSelectionReturn => {
  const { onError, onDocumentSelect } = options;
  const dispatch = useAppDispatch();

  // State
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>("");
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>("");
  const [documents, setDocuments] = useState<DocumentBasic[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState<boolean>(false);

  // Get the currently selected document object
  const getSelectedDocument = useCallback((): DocumentBasic | null => {
    if (!selectedDocumentId) return null;
    return documents.find((d) => d.id === parseInt(selectedDocumentId)) || null;
  }, [selectedDocumentId, documents]);

  // Handle collection selection change
  const handleCollectionChange = useCallback(
    async (collectionId: string) => {
      setSelectedCollectionId(collectionId);
      setSelectedDocumentId("");
      setDocuments([]);

      if (onDocumentSelect) {
        onDocumentSelect(null);
      }

      if (!collectionId) {
        return;
      }

      setIsLoadingDocuments(true);

      try {
        const result = await dispatch(
          fetchDocumentsByCollection(parseInt(collectionId))
        ).unwrap();

        setDocuments(result.documents);
      } catch (error) {
        console.error("Failed to fetch documents for collection:", error);
        if (onError) {
          onError(error);
        }
      } finally {
        setIsLoadingDocuments(false);
      }
    },
    [dispatch, onError, onDocumentSelect]
  );

  // Handle document selection change
  const handleDocumentChange = useCallback(
    (documentId: string) => {
      setSelectedDocumentId(documentId);

      if (onDocumentSelect) {
        if (!documentId) {
          onDocumentSelect(null);
        } else {
          const selectedDoc = documents.find(
            (d) => d.id === parseInt(documentId)
          );
          onDocumentSelect(selectedDoc || null);
        }
      }
    },
    [documents, onDocumentSelect]
  );

  // Reset all state
  const reset = useCallback(() => {
    setSelectedCollectionId("");
    setSelectedDocumentId("");
    setDocuments([]);
    setIsLoadingDocuments(false);
  }, []);

  return {
    // State
    selectedCollectionId,
    selectedDocumentId,
    documents,
    isLoadingDocuments,

    // Actions
    handleCollectionChange,
    handleDocumentChange,
    getSelectedDocument,
    reset,
  };
};