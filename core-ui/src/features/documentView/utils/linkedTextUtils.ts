// src/features/documentView/utils/linkedTextUtils.ts
import { RootState } from '@store';
import { linkingAnnotations } from '@store';

interface Selector {
  "type": string;
  "value": string;
  "refined_by": {
      "type": string;
      "start": number;
      "end": number;
  };
}

interface Annotation {
    "context": string;
    "id": string;
    "document_element_id": string;
    "document_id": number;
    "document_collection_id": number;
    "type": string;
    "creator": {
        "first_name": string,
        "last_name": string,
        "id": number,
        "user_metadata": {
            "role": string,
            "affiliation": string
        }
    };
    "created": string;
    "modified": string;
    "generator": string;
    "generated": string;
    "motivation": string;
    "body": {
        "id": string;
        "type": string;
        "value": string;
        "format": string;
        "language": string;
    };
    "target": Array<{
        "id": string;
        "type": string;
        "source": string;
        "selector"?: Selector;
    }>
}

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

interface AnnotationTarget {
  id: string;
  type: string;
  source: string;
  selector?: {
    type: string;
    value: string;
    refined_by?: {
      type: string;
      start: number;
      end: number;
    };
  };
}

// 🎯 FIXED: Enhanced document info resolver with better title lookup
const getDocumentInfoFromElementId = (
  elementId: number,
  allDocuments: Array<{ id: number; title: string; document_collection_id: number }>,
  allElements: Array<{ id: number; document_id: number; content?: unknown }>,
  viewedDocuments: Array<{ id: number; title: string; collectionId: number }>
): { documentId: number; collectionId: number; title: string } | null => {
  // Method 1: Find the element in the Redux store
  const element = allElements.find(el => el.id === elementId);
  if (element) {
    const document = allDocuments.find(doc => doc.id === element.document_id);
    if (document) {
      return {
        documentId: element.document_id,
        collectionId: document.document_collection_id,
        title: document.title
      };
    } else {
      // Element found but document not in allDocuments - try viewedDocuments
      const viewedDoc = viewedDocuments.find(d => d.id === element.document_id);
      if (viewedDoc) {
        return {
          documentId: element.document_id,
          collectionId: viewedDoc.collectionId,
          title: viewedDoc.title
        };
      } else {
        return {
          documentId: element.document_id,
          collectionId: 1, // Default collection
          title: `Document ${element.document_id}`
        };
      }
    }
  }
  return null;
};

// 🎯 FIXED: Enhanced document title resolver
const resolveDocumentTitleAndCollection = (
  documentId: number,
  allDocuments: Array<{ id: number; title: string; document_collection_id: number }>,
  viewedDocuments: Array<{ id: number; title: string; collectionId: number }>
): { title: string; collectionId: number } => {
  // First try: Look in allDocuments (from Redux store)
  const reduxDocument = allDocuments.find(doc => doc.id === documentId);
  if (reduxDocument) {
    return {
      title: reduxDocument.title,
      collectionId: reduxDocument.document_collection_id
    };
  }
  
  // Second try: Look in viewedDocuments (currently open documents)
  const viewedDocument = viewedDocuments.find(doc => doc.id === documentId);
  if (viewedDocument) {
    return {
      title: viewedDocument.title,
      collectionId: viewedDocument.collectionId
    };
  }
  
  // Fallback: Generate a descriptive title
  return {
    title: `Document ${documentId}`,
    collectionId: 1 // Default collection
  };
};

/**
 * Get all linking annotations that reference a specific document element
 */
const getAnnotationsForElement = (
  allAnnotations: Annotation[], 
  elementSourceURI: string
): Annotation[] => {
  return allAnnotations.filter(annotation => 
    annotation.target?.some((target: AnnotationTarget) => target.source === elementSourceURI)
  );
};

/**
 * 🎯 FIXED: Enhanced document title resolution
 */
export const getLinkedDocumentsSimple = (
  selection: LinkedTextSelection,
  allLinkingAnnotations: Annotation[],
  allDocuments: Array<{ id: number; title: string; document_collection_id: number }>,
  viewedDocuments: Array<{ id: number; title: string; collectionId: number }>,
  allElements: Array<{ id: number; document_id: number; content?: unknown }> = []
): HierarchicalLinkedDocuments => {
  const result: HierarchicalLinkedDocuments = {};
  
  // Find all annotations that reference our selected element
  const relevantAnnotations = getAnnotationsForElement(allLinkingAnnotations, selection.sourceURI);
  
  if (relevantAnnotations.length === 0) {
    const alternativeURIs = [
      selection.sourceURI,
      `/${selection.sourceURI}`,
      selection.sourceURI.replace(/^\//, ''),
      `/DocumentElements/${selection.documentElementId}`,
      `DocumentElements/${selection.documentElementId}`
    ];
    
    alternativeURIs.forEach(uri => {
      const altAnnotations = getAnnotationsForElement(allLinkingAnnotations, uri);
      if (altAnnotations.length > 0) {
        relevantAnnotations.push(...altAnnotations);
      }
    });
    
    if (relevantAnnotations.length === 0) {
      return result;
    }
  }
  
  // Process each annotation to find linked documents
  relevantAnnotations.forEach((annotation, annotationIndex) => {
    console.log(`🔗 [${annotationIndex + 1}/${relevantAnnotations.length}] Processing annotation:`, {
      id: annotation.id,
      documentId: annotation.document_id,
      targetCount: annotation.target?.length || 0,
      targets: annotation.target?.map(t => t.source) || []
    });
    
    // Find targets that are NOT our current selection
    const targetsNotCurrentSelection = annotation.target?.filter((target: AnnotationTarget) => 
      target.source !== selection.sourceURI
    ) || [];
    
    console.log('🔗 Targets not in current selection:', targetsNotCurrentSelection.map(t => t.source));
    
    if (targetsNotCurrentSelection.length === 0) {
      console.log('🔗 ⚠️ No cross-document targets found for annotation:', annotation.id);
      return;
    }
    
    // 🎯 FIXED: Group targets by document ID (not title) to prevent duplicates
    const targetsByDocumentId: { [docId: number]: { targets: AnnotationTarget[]; elementIds: number[] } } = {};
    
    targetsNotCurrentSelection.forEach(target => {
      const elementIdMatch = target.source.match(/\/DocumentElements\/(\d+)/);
      if (!elementIdMatch) {
        console.log('🔗 ❌ Could not extract element ID from:', target.source);
        return;
      }
      
      const elementId = parseInt(elementIdMatch[1]);
      console.log('🔗 Processing target element:', elementId, 'from source:', target.source);
      
      // Try to get document info
      const docInfo = getDocumentInfoFromElementId(elementId, allDocuments, allElements, viewedDocuments);
      
      if (docInfo) {
        console.log('🔗 ✅ Target element', elementId, '→ Document', docInfo.documentId, '(' + docInfo.title + ')');
        
        // Skip same-document links (unless in debug mode)
        if (docInfo.documentId === selection.documentId) {
          console.log('🔗 ⚠️ Skipping same-document link for document', docInfo.documentId);
          return;
        }
        
        // 🎯 CRITICAL: Group by document ID only
        if (!targetsByDocumentId[docInfo.documentId]) {
          targetsByDocumentId[docInfo.documentId] = { targets: [], elementIds: [] };
        }
        targetsByDocumentId[docInfo.documentId].targets.push(target);
        targetsByDocumentId[docInfo.documentId].elementIds.push(elementId);
      } else {
        console.log('🔗 ⚠️ Could not determine document for element', elementId);
        
        // Use the annotation's document_id as a fallback if it's different from current selection
        if (annotation.document_id && annotation.document_id !== selection.documentId) {
          console.log('🔗 📝 Using annotation document_id as fallback:', annotation.document_id);
          
          if (!targetsByDocumentId[annotation.document_id]) {
            targetsByDocumentId[annotation.document_id] = { targets: [], elementIds: [] };
          }
          targetsByDocumentId[annotation.document_id].targets.push(target);
          targetsByDocumentId[annotation.document_id].elementIds.push(elementId);
        }
      }
    });
    
    console.log('🔗 Cross-document targets found:', Object.keys(targetsByDocumentId).map(docId => ({
      docId: parseInt(docId),
      elementCount: targetsByDocumentId[parseInt(docId)].elementIds.length
    })));
    
    // 🎯 FIXED: Process each document ID only once, with consistent title resolution
    Object.keys(targetsByDocumentId).forEach(docIdStr => {
      const linkedDocumentId = parseInt(docIdStr);
      const { targets: docTargets, elementIds } = targetsByDocumentId[linkedDocumentId];
      
      console.log('🔗 Creating option for document', linkedDocumentId, 'with elements:', elementIds);
      
      // 🎯 CRITICAL: Initialize document entry ONCE per document ID
      if (!result[linkedDocumentId]) {
        // Resolve title consistently using the first found document info
        const firstElementId = elementIds[0];
        const docInfo = getDocumentInfoFromElementId(firstElementId, allDocuments, allElements, viewedDocuments);
        
        let documentTitle = `Document ${linkedDocumentId}`;
        let collectionId = 1;
        
        if (docInfo) {
          documentTitle = docInfo.title;
          collectionId = docInfo.collectionId;
        } else {
          // Fallback to resolveDocumentTitleAndCollection
          const resolved = resolveDocumentTitleAndCollection(linkedDocumentId, allDocuments, viewedDocuments);
          documentTitle = resolved.title;
          collectionId = resolved.collectionId;
        }
        
        const isCurrentlyViewed = viewedDocuments.some(d => d.id === linkedDocumentId);
        
        result[linkedDocumentId] = {
          documentId: linkedDocumentId,
          documentTitle: documentTitle,
          collectionId: collectionId,
          isCurrentlyOpen: isCurrentlyViewed,
          linkedTextOptions: []
        };
        
        console.log('🔗 ✅ Initialized document entry ONCE:', {
          id: linkedDocumentId,
          title: documentTitle,
          collection: collectionId
        });
      }
      
      // Get the primary target and all targets for this annotation
      const primaryTarget = docTargets[0];
      
      // Get ALL targets from the ENTIRE annotation (including source)
      const allTargets = annotation.target?.map((target: AnnotationTarget) => ({
        sourceURI: target.source,
        start: target.selector?.refined_by?.start || 0,
        end: target.selector?.refined_by?.end || 0,
        text: target.selector?.value || 'Linked text'
      })) || [];
      
      // Use primary target's text for display
      const linkedText = primaryTarget.selector?.value || annotation.body.value || 'Linked text';
      
      // 🎯 FIXED: Check for duplicate annotations more carefully
      const existingOptionIndex = result[linkedDocumentId].linkedTextOptions.findIndex(
        option => option.linkingAnnotationId === annotation.id
      );
      
      if (existingOptionIndex === -1) {
        const newOption: LinkedTextOption = {
          linkedText: linkedText,
          linkingAnnotationId: annotation.id,
          targetInfo: {
            sourceURI: primaryTarget.source,
            start: primaryTarget.selector?.refined_by?.start || 0,
            end: primaryTarget.selector?.refined_by?.end || 0,
          },
          allTargets: allTargets
        };
        
        result[linkedDocumentId].linkedTextOptions.push(newOption);
        console.log('🔗 ✅ Added option to existing document:', {
          annotation: annotation.id,
          document: result[linkedDocumentId].documentTitle,
          textPreview: linkedText.substring(0, 40) + '...',
          allTargetsCount: allTargets.length,
          totalOptionsForDoc: result[linkedDocumentId].linkedTextOptions.length
        });
      } else {
        console.log('🔗 ⚠️ Skipping duplicate annotation option:', annotation.id, 'for document', linkedDocumentId);
      }
    });
  });
  
  // Final summary
  console.log('🔗 === FINAL RESULT SUMMARY ===');
  console.log('🔗 Source document:', selection.documentId);
  console.log('🔗 Source element:', selection.sourceURI);
  Object.keys(result).forEach(docIdStr => {
    const docId = parseInt(docIdStr);
    const doc = result[docId];
    console.log(`📋 Target: ${doc.documentTitle} (ID: ${docId}):`, {
      collection: doc.collectionId,
      isOpen: doc.isCurrentlyOpen,
      linkedTextSections: doc.linkedTextOptions.length,
      firstTargetURI: doc.linkedTextOptions[0]?.targetInfo?.sourceURI
    });
  });
  console.log('🔗 === getLinkedDocumentsSimple END ===');
  
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
  console.log('🔧 === createSelectionFromDOMSelection called ===');
  console.log('🔧 Available documents:', documents.map(d => ({ id: d.id, title: d.title })));

  if (!selection || selection.rangeCount === 0) {
    console.log('🔧 ❌ No selection or ranges');
    return null;
  }
  
  const range = selection.getRangeAt(0);
  const selectedText = range.toString().trim();
  
  if (selectedText.length === 0) {
    console.log('🔧 ❌ No selected text');
    return null;
  }
  
  console.log('🔧 Selected text:', selectedText.substring(0, 50) + '...');
  
  // Find the document element
  let element = range.commonAncestorContainer as Node;
  
  while (element && element.nodeType !== Node.ELEMENT_NODE) {
    element = element.parentNode!;
  }
  
  let elementWithId = element as HTMLElement;
  console.log('🔧 Starting element search from:', {
    tagName: elementWithId?.tagName,
    id: elementWithId?.id,
    className: elementWithId?.className
  });
  
  // Find DocumentElements ID
  let attempts = 0;
  while (elementWithId && !elementWithId.id?.includes('DocumentElements') && attempts < 10) {
    console.log(`🔧 Attempt ${attempts + 1}: Checking element:`, {
      tagName: elementWithId.tagName,
      id: elementWithId.id,
      className: elementWithId.className
    });
    elementWithId = elementWithId.parentElement!;
    attempts++;
  }
  
  if (!elementWithId?.id || !elementWithId.id.includes('DocumentElements')) {
    console.log('🔧 ❌ No element with DocumentElements ID found after', attempts, 'attempts');
    return null;
  }
  
  console.log('🔧 ✅ Found DocumentElements element:', elementWithId.id);
  
  const elementId = extractNumericId(elementWithId.id);
  if (!elementId) {
    console.log('🔧 ❌ Could not extract numeric ID from:', elementWithId.id);
    return null;
  }
  
  console.log('🔧 Extracted element ID:', elementId);
  
  // 🎯 CRITICAL: Find document panel with enhanced debugging
  const finalPanel = elementWithId.closest('[data-document-id]') as HTMLElement;
  if (!finalPanel) {
    console.log('🔧 ❌ No document panel found');
    console.log('🔧 Searched from element:', elementWithId);
    // Try to find any data-document-id in the DOM for debugging
    const allPanels = document.querySelectorAll('[data-document-id]');
    console.log('🔧 Available document panels in DOM:', 
      Array.from(allPanels).map(panel => ({
        id: panel.getAttribute('data-document-id'),
        element: panel
      }))
    );
    return null;
  }
  
  const documentIdAttr = finalPanel.getAttribute('data-document-id');
  const documentId = parseInt(documentIdAttr || '0');
  
  console.log('🔧 Found document panel:', {
    documentId,
    elementId,
    panelElement: finalPanel
  });
  
  const foundDocument = documents.find(d => d.id === documentId);
  
  if (!foundDocument) {
    console.log('🔧 ❌ Document not found in documents array');
    console.log('🔧 Looking for document ID:', documentId);
    console.log('🔧 Available documents:', documents.map(d => ({ id: d.id, title: d.title })));
    return null;
  }
  
  console.log('🔧 ✅ Found matching document:', foundDocument);
  
  // Calculate text positions
  const elementText = elementWithId.textContent || '';
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
    sourceURI: `/DocumentElements/${elementId}`
  };
  
  console.log('🔧 ✅ Selection created successfully:', result);
  return result;
};

// Backward compatibility exports
export const findLinkingAnnotationsForSelection = (
  state: RootState,
  selection: LinkedTextSelection
): Annotation[] => {
  const allAnnotations = linkingAnnotations.selectors.selectAllAnnotations(state);
  return getAnnotationsForElement(allAnnotations, selection.sourceURI);
};

export const hasLinkedText = (
  state: RootState,
  selection: LinkedTextSelection
): boolean => {
  return findLinkingAnnotationsForSelection(state, selection).length > 0;
};