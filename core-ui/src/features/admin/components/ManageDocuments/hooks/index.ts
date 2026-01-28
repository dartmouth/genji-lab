// ManageDocuments/hooks/index.ts

export { useCollectionDocumentSelection } from "./useCollectionDocumentSelection";
export { useDeleteConfirmation } from "./useDeleteConfirmation";
export { useDocumentsWithStats } from "./useDocumentsWithStats";

// Re-export types that consumers might need
export type { ShowDeleteConfirmationParams } from "./useDeleteConfirmation";