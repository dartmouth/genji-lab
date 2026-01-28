// ManageDocuments/types/index.ts

// Import NotificationState from shared hooks location
export type { NotificationState } from "@admin/components/ManageCollections/types";

/**
 * Document with statistics - used in delete operations
 * Returns from /documents/collection/{id}/with-stats endpoint
 */
export interface DocumentWithStats {
  id: number;
  title: string;
  description: string;
  created: string;
  modified: string;
  scholarly_annotation_count: number;
  comment_count: number;
  element_count: number;
  total_annotation_count: number;
}

/**
 * Basic document info - used in rename and update description operations
 * Returns from fetchDocumentsByCollection
 */
export interface DocumentBasic {
  id: number;
  title: string;
  description: string;
}

/**
 * Form data for importing a Word document
 */
export interface ImportWordFormData {
  document_collection_id: number | undefined;
  title: string;
  description: string;
  file: File | null;
}

/**
 * Response data after successful Word document import
 */
export interface ImportedDocumentData {
  id: number;
  title: string;
  collection_id: number;
  collection_name: string;
  elements_created: number;
}

/**
 * Stats for document content (elements and annotations)
 * Used in delete content tab
 */
export interface DocumentContentStats {
  element_count: number;
  annotation_count: number;
}

/**
 * Document info for delete confirmation dialog
 */
export interface DocumentToDelete {
  id: number;
  title: string;
  scholarly_annotation_count?: number;
  comment_count?: number;
  element_count?: number;
}

/**
 * State for the delete confirmation dialog
 */
export interface DeleteConfirmDialogState {
  open: boolean;
  title: string;
  message: string;
  documentsToDelete: DocumentToDelete[];
}