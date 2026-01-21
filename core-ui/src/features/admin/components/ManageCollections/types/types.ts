/**
 * Reference to a user (creator or modifier)
 */
export interface UserReference {
  id: number;
  username: string;
  first_name?: string;
  last_name?: string;
}

/**
 * Full collection details returned from the API
 */
export interface CollectionDetails {
  id: number;
  title: string;
  description?: string;
  visibility: string;
  language: string;
  text_direction: string;
  created: string;
  modified: string;
  created_by?: UserReference;
  modified_by?: UserReference;
  document_count: number;
  element_count: number;
  scholarly_annotation_count: number;
  comment_count: number;
}

/**
 * Collection statistics shown in delete confirmation
 */
export interface CollectionStats {
  document_count: number;
  element_count: number;
  scholarly_annotation_count: number;
  comment_count: number;
  title: string;
  description?: string;
  visibility: string;
  created: string;
  modified: string;
}

/**
 * Simplified collection details for visibility update
 */
export interface VisibilityCollectionDetails {
  title: string;
  visibility: string;
  description?: string;
}

/**
 * Form data for creating a new collection
 */
export interface CreateCollectionFormData {
  title: string;
  visibility: string;
  text_direction: string;
  language: string;
}

/**
 * Notification state for snackbar alerts
 */
export interface NotificationState {
  open: boolean;
  message: string;
  severity: "success" | "error" | "info" | "warning";
}

/**
 * Confirmation dialog state
 */
export interface ConfirmDialogState {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  requiresNameConfirmation?: boolean;
  expectedName?: string;
}

/**
 * Sort options for the overview table
 */
export type OverviewSortOrder = "modified" | "title";
export type SortDirection = "asc" | "desc";

/**
 * Visibility options for collections
 */
export type CollectionVisibility = "public" | "private" | "restricted";

/**
 * Text direction options
 */
export type TextDirection = "ltr" | "rtl";

/**
 * Supported languages
 */
export type SupportedLanguage = "en" | "ja" | "fr" | "es" | "de";

/**
 * Props for SubTabPanel component
 */
export interface SubTabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

/**
 * API payload for creating a collection
 */
export interface CreateCollectionPayload {
  title: string;
  visibility: string;
  text_direction: string;
  language: string;
  hierarchy: {
    chapter: number;
    paragraph: number;
  };
  collection_metadata: Record<string, unknown>;
  created_by_id: number;
}

/**
 * API payload for updating a collection
 */
export interface UpdateCollectionPayload {
  id: number;
  updates: {
    title?: string;
    visibility?: string;
    modified_by_id: number;
  };
}