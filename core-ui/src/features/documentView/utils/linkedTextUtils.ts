// src/features/documentView/utils/linkedTextUtils.ts
// FIXED VERSION - Proper document detection and annotation grouping

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

// Legacy interface for backward compatibility
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

// 🎯 NEW: Document element to document mapping
// This should ideally come from your backend, but for now we'll create a mapping function
const getDocumentInfoFromElementId = (elementId: number): { documentId: number; collectionId: number; title: string } => {
  // Based on your database data, map element ranges to documents
  if (elementId >= 1 && elementId <= 31) {
    return { documentId: 1, collectionId: 1, title: 'Kiritsubo' };
  }
  if (elementId >= 32 && elementId <= 522) {
    return { documentId: 2, collectionId: 2, title: '桐壷' };
  }
  if (elementId >= 523 && elementId <= 1000) {
    return { documentId: 3, collectionId: 3, title: 'The Unexpected Party' };
  }
  
  // Fallback - you might need to adjust these ranges based on your actual data
  return { documentId: 1, collectionId: 1, title: `Document ${Math.floor(elementId / 100) + 1}` };
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
 * 🎯 FIXED: Get all documents that have links TO/FROM the current selection
 * Now properly groups by annotation and detects all linked documents
 */
export const getLinkedDocumentsSimple = (
  selection: LinkedTextSelection,
  allLinkingAnnotations: Annotation[],
  allDocuments: Array<{ id: number; title: string; document_collection_id: number }>,
  viewedDocuments: Array<{ id: number; title: string; collectionId: number }>
): HierarchicalLinkedDocuments => {
  const result: HierarchicalLinkedDocuments = {};
  
  console.log('🔗 getLinkedDocumentsSimple called with selection:', selection.sourceURI);
  console.log('🔗 Current viewed documents:', viewedDocuments.map(d => ({ id: d.id, collectionId: d.collectionId, title: d.title })));
  
  // Find all annotations that reference our selected element
  const relevantAnnotations = getAnnotationsForElement(allLinkingAnnotations, selection.sourceURI);
  console.log('🔗 Found relevant annotations:', relevantAnnotations.length);
  
  // 🎯 NEW: Process each annotation as a single linked text option
  relevantAnnotations.forEach(annotation => {
    console.log('🔗 Processing annotation:', {
      id: annotation.id,
      document_id: annotation.document_id,
      document_collection_id: annotation.document_collection_id,
      targetCount: annotation.target?.length || 0
    });
    
    // Find targets that are NOT our current selection
    const targetsNotCurrentSelection = annotation.target?.filter((target: AnnotationTarget) => 
      target.source !== selection.sourceURI
    ) || [];
    
    console.log('🔗 Targets not in current selection:', targetsNotCurrentSelection.map(t => t.source));
    
    if (targetsNotCurrentSelection.length === 0) {
      console.log('🔗 No linked elements found for annotation:', annotation.id);
      return;
    }
    
    // 🎯 FIXED: Group targets by document instead of processing each individually
    const targetsByDocument: { [docId: number]: AnnotationTarget[] } = {};
    
    targetsNotCurrentSelection.forEach(target => {
      const elementIdMatch = target.source.match(/\/DocumentElements\/(\d+)/);
      if (!elementIdMatch) {
        console.log('🔗 Could not extract element ID from:', target.source);
        return;
      }
      
      const elementId = parseInt(elementIdMatch[1]);
      const docInfo = getDocumentInfoFromElementId(elementId);
      
      console.log('🔗 Element', elementId, 'belongs to document', docInfo.documentId, ':', docInfo.title);
      
      if (!targetsByDocument[docInfo.documentId]) {
        targetsByDocument[docInfo.documentId] = [];
      }
      targetsByDocument[docInfo.documentId].push(target);
    });
    
    // Now create one option per linked document
    Object.keys(targetsByDocument).forEach(docIdStr => {
      const linkedDocumentId = parseInt(docIdStr);
      const documentsTargets = targetsByDocument[linkedDocumentId];
      const elementId = parseInt(documentsTargets[0].source.match(/\/DocumentElements\/(\d+)/)![1]);
      const docInfo = getDocumentInfoFromElementId(elementId);
      
      console.log('🔗 Creating option for document', linkedDocumentId, 'with', documentsTargets.length, 'targets');
      
      // Check if this document is currently being viewed
      const isCurrentlyViewed = viewedDocuments.some(d => d.id === linkedDocumentId);
      
      let documentTitle = docInfo.title;
      let documentCollectionId = docInfo.collectionId;
      
      // Override with store data if available
      const storeDoc = allDocuments.find(d => d.id === linkedDocumentId);
      if (storeDoc) {
        documentTitle = storeDoc.title;
        documentCollectionId = storeDoc.document_collection_id;
      }
      
      // Override with viewed document data if currently open
      const viewedDoc = viewedDocuments.find(d => d.id === linkedDocumentId);
      if (viewedDoc) {
        documentTitle = viewedDoc.title;
        documentCollectionId = viewedDoc.collectionId;
      }
      
      // Initialize document entry if not exists
      if (!result[linkedDocumentId]) {
        result[linkedDocumentId] = {
          documentId: linkedDocumentId,
          documentTitle: documentTitle,
          collectionId: documentCollectionId,
          isCurrentlyOpen: isCurrentlyViewed,
          linkedTextOptions: []
        };
        console.log('🔗 Initialized document entry for:', linkedDocumentId, '-', documentTitle);
      }
      
      // 🎯 FIXED: Create ONE option per annotation per document
      // Use the first target as the primary target, but include all targets in allTargets
      const primaryTarget = documentsTargets[0];
      
      // Get ALL targets from the entire annotation (including current selection)
      const allTargets = annotation.target?.map((target: AnnotationTarget) => ({
        sourceURI: target.source,
        start: target.selector?.refined_by?.start || 0,
        end: target.selector?.refined_by?.end || 0,
        text: target.selector?.value || 'Linked text'
      })) || [];
      
      // Use the selector value as the linked text (this is the actual text content)
      const linkedText = primaryTarget.selector?.value || annotation.body.value || 'Linked text';
      
      // Check if we already have this annotation for this document (avoid duplicates)
      const existingOption = result[linkedDocumentId].linkedTextOptions.find(
        option => option.linkingAnnotationId === annotation.id
      );
      
      if (!existingOption) {
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
        console.log('🔗 Added linked text option:', {
          annotationId: annotation.id,
          documentId: linkedDocumentId,
          linkedText: linkedText.substring(0, 50) + (linkedText.length > 50 ? '...' : ''),
          targetCount: allTargets.length
        });
      } else {
        console.log('🔗 Skipping duplicate annotation option for document:', linkedDocumentId);
      }
    });
  });
  
  console.log('🔗 Final result summary:');
  Object.keys(result).forEach(docIdStr => {
    const docId = parseInt(docIdStr);
    const doc = result[docId];
    console.log(`🔗 Document ${docId} (${doc.documentTitle}):`, {
      collectionId: doc.collectionId,
      isOpen: doc.isCurrentlyOpen,
      optionsCount: doc.linkedTextOptions.length,
      options: doc.linkedTextOptions.map(opt => ({
        annotationId: opt.linkingAnnotationId,
        text: opt.linkedText.substring(0, 30) + '...'
      }))
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
  console.log('🔧 createSelectionFromDOMSelection called');
  console.log('🔧 Selection:', selection);
  console.log('🔧 Documents:', documents.map(d => ({ id: d.id, title: d.title })));

  if (!selection || selection.rangeCount === 0) {
    console.log('🔧 ❌ No selection or ranges');
    return null;
  }
  
  const range = selection.getRangeAt(0);
  const selectedText = range.toString().trim();
  
  console.log('🔧 Selected text:', selectedText);
  console.log('🔧 Range:', {
    startContainer: range.startContainer,
    endContainer: range.endContainer,
    startOffset: range.startOffset,
    endOffset: range.endOffset
  });
  
  if (selectedText.length === 0) {
    console.log('🔧 ❌ No selected text');
    return null;
  }
  
  // Find the document element
  let element = range.commonAncestorContainer as Node;
  console.log('🔧 Common ancestor container:', element);
  
  while (element && element.nodeType !== Node.ELEMENT_NODE) {
    element = element.parentNode!;
    console.log('🔧 Moving to parent node:', element);
  }
  
  let elementWithId = element as HTMLElement;
  console.log('🔧 Starting element search from:', elementWithId, 'ID:', elementWithId?.id);
  
  // Try multiple approaches to find DocumentElements
  let attempts = 0;
  while (elementWithId && !elementWithId.id?.includes('DocumentElements') && attempts < 10) {
    console.log(`🔧 Attempt ${attempts + 1} - Current element:`, {
      tagName: elementWithId.tagName,
      id: elementWithId.id,
      className: elementWithId.className
    });
    
    elementWithId = elementWithId.parentElement!;
    attempts++;
  }
  
  console.log('🔧 Final element with ID search result:', {
    element: elementWithId,
    id: elementWithId?.id,
    foundDocumentElement: elementWithId?.id?.includes('DocumentElements')
  });
  
  if (!elementWithId?.id || !elementWithId.id.includes('DocumentElements')) {
    console.log('🔧 ❌ No element with DocumentElements ID found');
    
    // DEBUG: Let's see what elements are actually in the DOM
    console.log('🔧 DEBUG: Searching for DocumentElements in DOM...');
    const allDocElements = document.querySelectorAll('[id*="DocumentElements"]');
    console.log('🔧 Found DocumentElements in DOM:', Array.from(allDocElements).map(el => ({
      id: el.id,
      tagName: el.tagName,
      text: el.textContent?.substring(0, 50) + '...'
    })));
    
    return null;
  }
  
  const elementId = extractNumericId(elementWithId.id);
  console.log('🔧 Extracted numeric ID:', elementId);
  
  if (!elementId) {
    console.log('🔧 ❌ Could not extract numeric ID from:', elementWithId.id);
    return null;
  }
  
  // Find which document this belongs to
  console.log('🔧 Looking for document panel wrapper...');
  const documentPanel = elementWithId.closest('.document-panel-wrapper') as HTMLElement;
  console.log('🔧 Document panel found:', !!documentPanel);
  
  if (documentPanel) {
    console.log('🔧 Document panel attributes:', {
      'data-document-id': documentPanel.getAttribute('data-document-id'),
      className: documentPanel.className,
      id: documentPanel.id
    });
  } else {
    // Try alternative selectors
    console.log('🔧 Trying alternative document container selectors...');
    const altPanel1 = elementWithId.closest('[data-document-id]') as HTMLElement;
    const altPanel2 = elementWithId.closest('.document-content-panel') as HTMLElement;
    const altPanel3 = elementWithId.closest('.document-panel') as HTMLElement;
    
    console.log('🔧 Alternative panels:', {
      'data-document-id selector': !!altPanel1,
      'document-content-panel': !!altPanel2,
      'document-panel': !!altPanel3
    });
    
    if (altPanel1) {
      console.log('🔧 Using alternative panel with data-document-id');
    }
  }
  
  const finalPanel = documentPanel || elementWithId.closest('[data-document-id]') as HTMLElement;
  
  if (!finalPanel) {
    console.log('🔧 ❌ No document panel found');
    return null;
  }
  
  const documentId = parseInt(finalPanel.getAttribute('data-document-id') || '0');
  console.log('🔧 Parsed document ID:', documentId);
  
  const foundDocument = documents.find(d => d.id === documentId);
  console.log('🔧 Found document:', foundDocument);
  
  if (!foundDocument) {
    console.log('🔧 ❌ Document not found in documents array');
    return null;
  }
  
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