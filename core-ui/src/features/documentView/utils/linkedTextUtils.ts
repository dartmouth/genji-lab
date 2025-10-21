// src/features/documentView/utils/linkedTextUtils.ts
import { RootState } from "@store";
import { linkingAnnotations } from "@store";
import { 
  Annotation,
  TextTarget,
  ObjectTarget
 } from "@documentView/types";

export interface LinkedTextSelection {
  documentId: number;
  documentElementId: number;
  text: string;
  start: number;
  end: number;
  sourceURI: string;
}

export interface LinkedTextOption {
  linkedText: string;
  linkingAnnotationId: string;
  targetInfo: {
    sourceURI: string;
    start: number;
    end: number;
  };
  allTargets: Array<{
    sourceURI: string;
    start: number;
    end: number;
    text: string;
  }>;
}

export interface LinkedDocument {
  documentId: number;
  documentTitle: string;
  collectionId: number;
  linkedText: string;
  targetInfo: {
    sourceURI: string;
    start: number;
    end: number;
  };
  allTargets?: Array<{
    sourceURI: string;
    start: number;
    end: number;
    text: string;
  }>;
}

export interface HierarchicalLinkedDocument {
  documentId: number;
  documentTitle: string;
  collectionId: number;
  isCurrentlyOpen: boolean;
  linkedTextOptions: LinkedTextOption[];
}

export interface HierarchicalLinkedDocuments {
  [documentId: number]: HierarchicalLinkedDocument;
}

// interface AnnotationTarget {
//   id: string;
//   type: string;
//   source: string;
//   selector?: {
//     type: string;
//     value: string;
//     refined_by?: {
//       type: string;
//       start: number;
//       end: number;
//     };
//   };
// }

// Enhanced document info resolver with better title lookup
const getDocumentInfoFromElementId = (
  elementId: number,
  allDocuments: Array<{
    id: number;
    title: string;
    document_collection_id: number;
  }>,
  allElements: Array<{ id: number; document_id: number; content?: unknown }>,
  viewedDocuments: Array<{ id: number; title: string; collectionId: number }>
): { documentId: number; collectionId: number; title: string } | null => {
  // Method 1: Find the element in the Redux store
  const element = allElements.find((el) => el.id === elementId);
  if (element) {
    const document = allDocuments.find((doc) => doc.id === element.document_id);
    if (document) {
      return {
        documentId: element.document_id,
        collectionId: document.document_collection_id,
        title: document.title,
      };
    } else {
      // Element found but document not in allDocuments - try viewedDocuments
      const viewedDoc = viewedDocuments.find(
        (d) => d.id === element.document_id
      );
      if (viewedDoc) {
        return {
          documentId: element.document_id,
          collectionId: viewedDoc.collectionId,
          title: viewedDoc.title,
        };
      } else {
        return {
          documentId: element.document_id,
          collectionId: 1, // Default collection
          title: `Document ${element.document_id}`,
        };
      }
    }
  }
  return null;
};

// Enhanced document title resolver
const resolveDocumentTitleAndCollection = (
  documentId: number,
  allDocuments: Array<{
    id: number;
    title: string;
    document_collection_id: number;
  }>,
  viewedDocuments: Array<{ id: number; title: string; collectionId: number }>
): { title: string; collectionId: number } => {
  // First try: Look in allDocuments (from Redux store)
  const reduxDocument = allDocuments.find((doc) => doc.id === documentId);
  if (reduxDocument) {
    return {
      title: reduxDocument.title,
      collectionId: reduxDocument.document_collection_id,
    };
  }

  // Second try: Look in viewedDocuments (currently open documents)
  const viewedDocument = viewedDocuments.find((doc) => doc.id === documentId);
  if (viewedDocument) {
    return {
      title: viewedDocument.title,
      collectionId: viewedDocument.collectionId,
    };
  }

  // Fallback: Generate a descriptive title
  return {
    title: `Document ${documentId}`,
    collectionId: 1, // Default collection
  };
};

/**
 * Get all linking annotations that reference a specific document element
 */
const getAnnotationsForElement = (
  allAnnotations: Annotation[],
  elementSourceURI: string
): Annotation[] => {
  return allAnnotations.filter((annotation) =>
    annotation.target?.some((target) => {
      // Handle both single targets and multi-element target arrays
      const targetGroup = Array.isArray(target) ? target : [target];
      
      // Check if any target in the group matches the element source URI
      return targetGroup.some((t) => t.source === elementSourceURI);
    })
  );
};

/**
 * Enhanced document title resolution
 */
export const getLinkedDocumentsSimple = (
  selection: LinkedTextSelection,
  allLinkingAnnotations: Annotation[],
  allDocuments: Array<{
    id: number;
    title: string;
    document_collection_id: number;
  }>,
  viewedDocuments: Array<{ id: number; title: string; collectionId: number }>,
  allElements: Array<{
    id: number;
    document_id: number;
    content?: unknown;
  }> = []
): HierarchicalLinkedDocuments => {
  const result: HierarchicalLinkedDocuments = {};

  // Find all annotations that reference our selected element
  const relevantAnnotations = getAnnotationsForElement(
    allLinkingAnnotations,
    selection.sourceURI
  );

  if (relevantAnnotations.length === 0) {
    const alternativeURIs = [
      selection.sourceURI,
      `/${selection.sourceURI}`,
      selection.sourceURI.replace(/^\//, ""),
      `/DocumentElements/${selection.documentElementId}`,
      `DocumentElements/${selection.documentElementId}`,
    ];

    alternativeURIs.forEach((uri) => {
      const altAnnotations = getAnnotationsForElement(
        allLinkingAnnotations,
        uri
      );
      if (altAnnotations.length > 0) {
        relevantAnnotations.push(...altAnnotations);
      }
    });

    if (relevantAnnotations.length === 0) {
      return result;
    }
  }

  // Process each annotation to find linked documents
  relevantAnnotations.forEach((annotation) => {

    const targetsNotCurrentSelection: (TextTarget | ObjectTarget)[] = [];
  
    annotation.target?.forEach((target) => {
      // Handle both single targets and multi-element target arrays
      const targetGroup = Array.isArray(target) ? target : [target];
      
      // Add targets that don't match the current selection
      targetGroup.forEach((t) => {
        if (t.source !== selection.sourceURI) {
          targetsNotCurrentSelection.push(t);
        }
      });
    });
    
    if (targetsNotCurrentSelection.length === 0) {
      return;
    }
  
    // Group targets by document ID (not title) to prevent duplicates
    const targetsByDocumentId: {
      [docId: number]: { targets: (TextTarget | ObjectTarget)[]; elementIds: number[] };
    } = {};
    // Find targets that are not our current selection
    // const targetsNotCurrentSelection =
    //   annotation.target?.filter(
    //     (target: AnnotationTarget) => target.source !== selection.sourceURI
    //   ) || [];

    if (targetsNotCurrentSelection.length === 0) {
      return;
    }

    // Group targets by document ID (not title) to prevent duplicates
    // const targetsByDocumentId: {
    //   [docId: number]: { targets: AnnotationTarget[]; elementIds: number[] };
    // } = {};

    targetsNotCurrentSelection.forEach((target) => {
      const elementIdMatch = target.source.match(/\/DocumentElements\/(\d+)/);
      if (!elementIdMatch) {
        return;
      }

      const elementId = parseInt(elementIdMatch[1]);

      // Try to get document info
      const docInfo = getDocumentInfoFromElementId(
        elementId,
        allDocuments,
        allElements,
        viewedDocuments
      );

      if (docInfo) {
        // Skip same-document links (unless in debug mode)
        if (docInfo.documentId === selection.documentId) {
          return;
        }

        // Group by document ID only
        if (!targetsByDocumentId[docInfo.documentId]) {
          targetsByDocumentId[docInfo.documentId] = {
            targets: [],
            elementIds: [],
          };
        }
        targetsByDocumentId[docInfo.documentId].targets.push(target);
        targetsByDocumentId[docInfo.documentId].elementIds.push(elementId);
      } else {
        // Use the annotation's document_id as a fallback if it's different from current selection
        if (
          annotation.document_id &&
          annotation.document_id !== selection.documentId
        ) {
          if (!targetsByDocumentId[annotation.document_id]) {
            targetsByDocumentId[annotation.document_id] = {
              targets: [],
              elementIds: [],
            };
          }
          targetsByDocumentId[annotation.document_id].targets.push(target);
          targetsByDocumentId[annotation.document_id].elementIds.push(
            elementId
          );
        }
      }
    });

    // Process each document ID only once, with consistent title resolution
    Object.keys(targetsByDocumentId).forEach((docIdStr) => {
      const linkedDocumentId = parseInt(docIdStr);
      const { targets: docTargets, elementIds } =
        targetsByDocumentId[linkedDocumentId];

      // Initialize document entry ONCE per document ID
      if (!result[linkedDocumentId]) {
        // Resolve title consistently using the first found document info
        const firstElementId = elementIds[0];
        const docInfo = getDocumentInfoFromElementId(
          firstElementId,
          allDocuments,
          allElements,
          viewedDocuments
        );

        let documentTitle = `Document ${linkedDocumentId}`;
        let collectionId = 1;

        if (docInfo) {
          documentTitle = docInfo.title;
          collectionId = docInfo.collectionId;
        } else {
          // Fallback to resolveDocumentTitleAndCollection
          const resolved = resolveDocumentTitleAndCollection(
            linkedDocumentId,
            allDocuments,
            viewedDocuments
          );
          documentTitle = resolved.title;
          collectionId = resolved.collectionId;
        }

        const isCurrentlyViewed = viewedDocuments.some(
          (d) => d.id === linkedDocumentId
        );

        result[linkedDocumentId] = {
          documentId: linkedDocumentId,
          documentTitle: documentTitle,
          collectionId: collectionId,
          isCurrentlyOpen: isCurrentlyViewed,
          linkedTextOptions: [],
        };
      }

      // Get the primary target and all targets for this annotation
      const primaryTarget = docTargets[0];

      // Get ALL targets from the ENTIRE annotation (including source)
      // const allTargets =
      //   annotation.target?.map((target: AnnotationTarget) => ({
      //     sourceURI: target.source,
      //     start: target.selector?.refined_by?.start || 0,
      //     end: target.selector?.refined_by?.end || 0,
      //     text: target.selector?.value || "Linked text",
      //   })) || [];

      // // Use primary target's text for display
      // const linkedText =
      //   primaryTarget.selector?.value || annotation.body.value || "Linked text";

      // // Check for duplicate annotations more carefully
      // const existingOptionIndex = result[
      //   linkedDocumentId
      // ].linkedTextOptions.findIndex(
      //   (option) => option.linkingAnnotationId === annotation.id
      // );

      // if (existingOptionIndex === -1) {
      //   const newOption: LinkedTextOption = {
      //     linkedText: linkedText,
      //     linkingAnnotationId: annotation.id,
      //     targetInfo: {
      //       sourceURI: primaryTarget.source,
      //       start: primaryTarget.selector?.refined_by?.start || 0,
      //       end: primaryTarget.selector?.refined_by?.end || 0,
      //     },
      //     allTargets: allTargets,
      //   };

      //   result[linkedDocumentId].linkedTextOptions.push(newOption);
      // }
      // Helper function to check if target is a TextTarget with selector
    const isTextTargetWithSelector = (target: TextTarget | ObjectTarget): target is TextTarget => {
      return 'selector' in target && target.selector != null;
    };

    // Helper to safely extract target info
    const getTargetInfo = (target: TextTarget | ObjectTarget) => ({
      sourceURI: target.source,
      start: isTextTargetWithSelector(target) ? (target.selector?.refined_by?.start ?? 0) : 0,
      end: isTextTargetWithSelector(target) ? (target.selector?.refined_by?.end ?? 0) : 0,
      text: isTextTargetWithSelector(target) ? (target.selector?.value ?? "Linked text") : "Linked text",
    });

    // Flatten and map all targets
    const allTargets = annotation.target?.flatMap((target) => {
      const targetGroup = Array.isArray(target) ? target : [target];
      return targetGroup.map(getTargetInfo);
    }) || [];

    // Use primary target's text for display
    const linkedText = 
      isTextTargetWithSelector(primaryTarget) 
        ? (primaryTarget.selector?.value ?? annotation.body.value ?? "Linked text")
        : (annotation.body.value ?? "Linked text");

    // Check for duplicate annotations more carefully
    const existingOptionIndex = result[
      linkedDocumentId
    ].linkedTextOptions.findIndex(
      (option) => option.linkingAnnotationId === annotation.id
    );

    if (existingOptionIndex === -1) {
      const primaryTargetInfo = getTargetInfo(primaryTarget);
      
      const newOption: LinkedTextOption = {
        linkedText: linkedText,
        linkingAnnotationId: annotation.id,
        targetInfo: {
          sourceURI: primaryTargetInfo.sourceURI,
          start: primaryTargetInfo.start,
          end: primaryTargetInfo.end,
        },
        allTargets: allTargets,
      };
      result[linkedDocumentId].linkedTextOptions.push(newOption);
    }
    });
  });

  return result;
};

/**
 * Helper functions
 */
const extractNumericId = (fullId: string): string | null => {
  const match = fullId.match(/\/DocumentElements\/(\d+)/);
  return match ? match[1] : null;
};

export const createSelectionFromDOMSelection = (
  selection: Selection,
  documents: Array<{ id: number; title: string; collectionId: number }>
): LinkedTextSelection | null => {
  if (!selection || selection.rangeCount === 0) {
    return null;
  }

  const range = selection.getRangeAt(0);
  const selectedText = range.toString().trim();

  if (selectedText.length === 0) {
    return null;
  }

  // Find the document element
  let element = range.commonAncestorContainer as Node;

  while (element && element.nodeType !== Node.ELEMENT_NODE) {
    element = element.parentNode!;
  }

  let elementWithId = element as HTMLElement;

  // Find DocumentElements ID
  let attempts = 0;
  while (
    elementWithId &&
    !elementWithId.id?.includes("DocumentElements") &&
    attempts < 10
  ) {
    elementWithId = elementWithId.parentElement!;
    attempts++;
  }

  if (!elementWithId?.id || !elementWithId.id.includes("DocumentElements")) {
    return null;
  }

  const elementId = extractNumericId(elementWithId.id);
  if (!elementId) {
    return null;
  }

  // Find document panel with enhanced debugging
  const finalPanel = elementWithId.closest("[data-document-id]") as HTMLElement;
  if (!finalPanel) {
    return null;
  }

  const documentIdAttr = finalPanel.getAttribute("data-document-id");
  const documentId = parseInt(documentIdAttr || "0");

  const foundDocument = documents.find((d) => d.id === documentId);

  if (!foundDocument) {
    return null;
  }

  // Calculate text positions
  const elementText = elementWithId.textContent || "";
  const rangeText = range.toString();
  let startOffset = elementText.indexOf(rangeText);
  let endOffset = startOffset + rangeText.length;

  if (startOffset === -1) {
    startOffset = 0;
    endOffset = rangeText.length;
  }

  const result = {
    documentId: foundDocument.id,
    documentElementId: parseInt(elementId),
    text: selectedText,
    start: startOffset,
    end: endOffset,
    sourceURI: `/DocumentElements/${elementId}`,
  };

  return result;
};

// Backward compatibility exports
export const findLinkingAnnotationsForSelection = (
  state: RootState,
  selection: LinkedTextSelection
): Annotation[] => {
  const allAnnotations =
    linkingAnnotations.selectors.selectAllAnnotations(state);
  return getAnnotationsForElement(allAnnotations, selection.sourceURI);
};

export const hasLinkedText = (
  state: RootState,
  selection: LinkedTextSelection
): boolean => {
  return findLinkingAnnotationsForSelection(state, selection).length > 0;
};
