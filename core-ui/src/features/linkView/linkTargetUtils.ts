// src/features/linkView/linkTargetUtils.ts

import { TextTarget } from "@documentView/types";
import { DocumentElement } from "@/types";
import type { Document } from "@store/slice/documentSlice";
import type { DocumentCollection } from "@store/slice/documentCollectionSlice";

/**
 * Interface for resolved target metadata
 */
export interface ResolvedTargetMetadata {
  elementId: number | null;
  documentId: number | null;
  documentCollectionId: number | null;
  documentTitle: string;
  documentCollectionTitle: string;
  quotedText: string;
  startPosition: number | null;
  endPosition: number | null;
}

/**
 * Extract element ID from a source URI
 */
export const extractElementIdFromSource = (source: string): number | null => {
  if (!source) return null;

  // Try multiple patterns to match different URI formats
  const patterns = [
    /\/DocumentElements\/(\d+)/i,
    /DocumentElements\/(\d+)/i,
    /\/DocumentElement\/(\d+)/i,
    /DocumentElement\/(\d+)/i,
  ];

  for (const pattern of patterns) {
    const match = source.match(pattern);
    if (match && match[1]) {
      const id = parseInt(match[1], 10);
      if (!isNaN(id)) {
        return id;
      }
    }
  }

  // Fallback: try to extract any number from the string
  const numberMatch = source.match(/(\d+)/);
  if (numberMatch && numberMatch[1]) {
    const id = parseInt(numberMatch[1], 10);
    if (!isNaN(id)) {
      console.warn("Using fallback number extraction for source:", source);
      return id;
    }
  }

  console.warn("Unable to parse element ID from source:", source);
  return null;
};

/**
 * Resolve a TextTarget into human-readable metadata
 *
 * @param target - The TextTarget to resolve
 * @param allElements - All loaded DocumentElements from Redux
 * @param allDocuments - All loaded Documents from Redux
 * @param allCollections - All loaded DocumentCollections from Redux
 * @returns Resolved metadata object
 */
export const resolveTargetMetadata = (
  target: TextTarget,
  allElements: DocumentElement[],
  allDocuments: Document[],
  allCollections: DocumentCollection[]
): ResolvedTargetMetadata => {
  // Extract element ID from source
  const elementId = extractElementIdFromSource(target.source);

  // Find the element
  const element = elementId
    ? allElements.find((el) => el.id === elementId)
    : null;

  // Get document ID from element
  const documentId = element?.document_id ?? null;

  // Find the document
  const document = documentId
    ? allDocuments.find((doc) => doc.id === documentId)
    : null;

  // Get document collection ID from document
  const documentCollectionId = document?.document_collection_id ?? null;

  // Find the document collection
  const documentCollection = documentCollectionId
    ? allCollections.find((col) => col.id === documentCollectionId)
    : null;

  // Extract text and position information
  const quotedText = target.selector?.value ?? "No text available";
  const startPosition = target.selector?.refined_by?.start ?? null;
  const endPosition = target.selector?.refined_by?.end ?? null;

  return {
    elementId,
    documentId,
    documentCollectionId,
    documentTitle: document?.title ?? "Unknown Document",
    documentCollectionTitle: documentCollection?.title ?? "Unknown Collection",
    quotedText,
    startPosition,
    endPosition,
  };
};

/**
 * Resolve multiple targets and check if they're from the same document/collection
 * Useful for displaying group-level metadata
 */
export const resolveTargetGroupMetadata = (
  targets: TextTarget[],
  allElements: DocumentElement[],
  allDocuments: Document[],
  allCollections: DocumentCollection[]
): {
  resolvedTargets: ResolvedTargetMetadata[];
  isSameDocument: boolean;
  isSameCollection: boolean;
  commonDocumentTitle: string | null;
  commonCollectionTitle: string | null;
} => {
  const resolvedTargets = targets.map((target) =>
    resolveTargetMetadata(target, allElements, allDocuments, allCollections)
  );

  // Check if all targets are from the same document
  const documentIds = new Set(
    resolvedTargets
      .map((rt) => rt.documentId)
      .filter((id): id is number => id !== null)
  );
  const isSameDocument = documentIds.size === 1;

  // Check if all targets are from the same collection
  const collectionIds = new Set(
    resolvedTargets
      .map((rt) => rt.documentCollectionId)
      .filter((id): id is number => id !== null)
  );
  const isSameCollection = collectionIds.size === 1;

  return {
    resolvedTargets,
    isSameDocument,
    isSameCollection,
    commonDocumentTitle:
      isSameDocument && resolvedTargets[0]
        ? resolvedTargets[0].documentTitle
        : null,
    commonCollectionTitle:
      isSameCollection && resolvedTargets[0]
        ? resolvedTargets[0].documentCollectionTitle
        : null,
  };
};
