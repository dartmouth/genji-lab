// src/store/selector/combinedSelectors.ts
import { createSelector } from "@reduxjs/toolkit";
import {
  commentingAnnotations,
  scholarlyAnnotations,
  RootState,
} from "../index";
import { Annotation } from "@documentView/types";
import { DocumentElement } from "@/types";

// ============================================================================
// EXISTING SELECTOR
// ============================================================================
export const selectAllAnnotationsForParagraph = createSelector(
  [
    (state: RootState, paragraphId: string) =>
      commentingAnnotations.selectors.selectAnnotationsByParent(
        state,
        paragraphId
      ),
    (state: RootState, paragraphId: string) =>
      scholarlyAnnotations.selectors.selectAnnotationsByParent(
        state,
        paragraphId
      ),
  ],
  (comments, scholarly) => [...comments, ...scholarly]
);

// ============================================================================
// NEW MEMOIZED SELECTORS FOR LINKING ANNOTATIONS
// ============================================================================

// Selector to get all linking annotations (memoized)
export const selectAllLinkingAnnotations = createSelector(
  [(state: RootState) => state.annotations?.linking],
  (linkingState) => {
    if (!linkingState) {
      return [];
    }
    const annotations = Object.values(linkingState.byId || {}).filter(
      (annotation): annotation is Annotation =>
        annotation !== undefined && annotation !== null
    );
    return annotations;
  }
);

// Helper function to normalize URI to standard format: DocumentElements/1
const normalizeURI = (uri: string): string => {
  // Remove leading slash if present
  return uri.replace(/^\//, "");
};

// Helper function to flatten nested target arrays
const flattenTargets = (
  targets: (unknown | unknown[])[]
): Array<{ source: string; selector?: unknown }> => {
  const flattened: Array<{ source: string; selector?: unknown }> = [];

  targets.forEach((target) => {
    if (Array.isArray(target)) {
      // Target is an array, so flatten it
      target.forEach((t) => {
        if (t && typeof t === "object" && "source" in t) {
          flattened.push(t);
        }
      });
    } else if (target && typeof target === "object" && "source" in target) {
      // Target is a single object
      flattened.push(target);
    }
  });

  return flattened;
};

// Selector to get linking annotations for a specific paragraph (memoized)
export const selectLinkingAnnotationsByParagraph = createSelector(
  [
    selectAllLinkingAnnotations,
    (_state: RootState, paragraphId: string) => paragraphId,
  ],
  (allLinkingAnnotations, paragraphId) => {
    // Normalize the paragraph ID to standard format
    const normalizedParagraphId = normalizeURI(paragraphId);

    return allLinkingAnnotations.filter((anno) => {
      if (!anno?.target || !Array.isArray(anno.target)) {
        return false;
      }

      // Flatten the nested target arrays
      const flattenedTargets = flattenTargets(anno.target);

      // Check if any target matches the paragraph ID
      return flattenedTargets.some((target) => {
        const normalizedTargetSource = normalizeURI(target.source);
        return normalizedTargetSource === normalizedParagraphId;
      });
    });
  }
);

// ============================================================================
// NEW MEMOIZED SELECTORS FOR DOCUMENT ELEMENTS
// ============================================================================

// Selector to get all loaded document IDs
const selectAllLoadedDocumentIds = createSelector(
  [(state: RootState) => state.documentElements.elementsByDocumentId],
  (elementsByDocumentId) => {
    return Object.keys(elementsByDocumentId).map(Number);
  }
);

// Selector to get all elements from all loaded documents (memoized)
export const selectAllLoadedElements = createSelector(
  [
    (state: RootState) => state.documentElements.elementsByDocumentId,
    selectAllLoadedDocumentIds,
  ],
  (elementsByDocumentId, allLoadedDocumentIds) => {
    const elements: DocumentElement[] = [];
    const elementIds = new Set<number>();

    allLoadedDocumentIds.forEach((docId) => {
      const docElements = elementsByDocumentId[docId];
      if (docElements && docElements.length > 0) {
        docElements.forEach((element) => {
          if (!elementIds.has(element.id)) {
            elements.push(element);
            elementIds.add(element.id);
          }
        });
      }
    });

    return elements;
  }
);

// ============================================================================
// MEMOIZED SELECTOR FOR DOCUMENT VIEWER CONTAINER
// ============================================================================

// Helper to get document IDs from linking annotations
const selectReferencedDocumentIds = createSelector(
  [selectAllLinkingAnnotations],
  (linkingAnns) => {
    const referencedDocumentIds = new Set<number>();

    // Extract all document IDs from annotations
    linkingAnns.forEach((annotation) => {
      if (annotation.document_id) {
        referencedDocumentIds.add(annotation.document_id);
      }
    });

    return Array.from(referencedDocumentIds);
  }
);

// Memoized selector for all elements needed in DocumentViewerContainer
export const selectAllElementsForViewing = createSelector(
  [
    (state: RootState) => state.documentElements.elementsByDocumentId,
    (_state: RootState, viewedDocuments: Array<{ id: number }>) =>
      viewedDocuments,
    selectReferencedDocumentIds,
  ],
  (elementsByDocumentId, viewedDocuments, referencedDocumentIds) => {
    const elements: DocumentElement[] = [];
    const elementIds = new Set<number>();

    // Helper to add elements without duplicates
    const addElements = (docElements: DocumentElement[] | undefined) => {
      if (docElements && docElements.length > 0) {
        docElements.forEach((element) => {
          if (!elementIds.has(element.id)) {
            elements.push(element);
            elementIds.add(element.id);
          }
        });
      }
    };

    // Get elements for all viewed documents
    viewedDocuments.forEach((doc) => {
      addElements(elementsByDocumentId[doc.id]);
    });

    // Get elements from all referenced documents
    referencedDocumentIds.forEach((docId) => {
      addElements(elementsByDocumentId[docId]);
    });

    return elements;
  }
);

// ============================================================================
// FACTORY SELECTORS (for cases where you need parametrized selectors)
// ============================================================================

// Factory function to create a memoized selector for linking annotations by paragraph
// Use this if you need a selector instance per component
export const makeSelectLinkingAnnotationsByParagraph = () =>
  createSelector(
    [
      selectAllLinkingAnnotations,
      (_state: RootState, paragraphId: string) => paragraphId,
    ],
    (allLinkingAnnotations, paragraphId) => {
      // Normalize the paragraph ID to standard format
      const normalizedParagraphId = normalizeURI(paragraphId);

      return allLinkingAnnotations.filter((anno) => {
        if (!anno?.target || !Array.isArray(anno.target)) {
          return false;
        }

        // Flatten the nested target arrays
        const flattenedTargets = flattenTargets(anno.target);

        // Check if any target matches the paragraph ID
        return flattenedTargets.some((target) => {
          const normalizedTargetSource = normalizeURI(target.source);
          return normalizedTargetSource === normalizedParagraphId;
        });
      });
    }
  );
