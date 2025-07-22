// src/features/documentView/utils/linkedTextUtils.ts

import { RootState } from '@store';
import { linkingAnnotations } from '@store';
import { Annotation } from '@documentView/types';

export interface LinkedTextSelection {
  documentId: number;
  documentElementId: number;
  text: string;
  start: number;
  end: number;
  sourceURI: string;
}

export interface LinkedDocument {
  documentId: number;
  documentTitle: string;
  linkedText: string;
  linkingAnnotationId: string;
  targetInfo: {
    sourceURI: string;
    start: number;
    end: number;
  };
  collectionId?: number; // Added for opening documents
}

/**
 * Finds all linking annotations that contain the given text selection
 */
export const findLinkingAnnotationsForSelection = (
  state: RootState,
  selection: LinkedTextSelection
): Annotation[] => {
  try {
    // Get all linking annotations using the correct selector
    const allLinkingAnnotations = linkingAnnotations.selectors.selectAllAnnotations(state);
    
    // Filter annotations that contain a target matching our selection
    return allLinkingAnnotations.filter((annotation: Annotation) => {
      if (!annotation.target || !Array.isArray(annotation.target)) {
        return false;
      }
      
      return annotation.target.some((target) => {
        // Check if this target matches our selection
        const targetSourceURI = target.source;
        const selectionSourceURI = selection.sourceURI;
        
        if (targetSourceURI !== selectionSourceURI) {
          return false;
        }
        
        // Check if the text ranges overlap using your selector structure
        const targetStart = target.selector?.refined_by?.start;
        const targetEnd = target.selector?.refined_by?.end;
        
        if (targetStart === undefined || targetEnd === undefined) {
          return false;
        }
        
        // Check for overlap between selection and target
        return !(selection.end <= targetStart || selection.start >= targetEnd);
      });
    });
  } catch (error) {
    console.warn('Error finding linking annotations:', error);
    return [];
  }
};

/**
 * Extracts linked documents from linking annotations for a given selection
 * Enhanced to work even when target documents aren't currently viewed
 */
export const getLinkedDocumentsForSelection = (
  state: RootState,
  selection: LinkedTextSelection,
  documentsMap: Map<number, { id: number; title: string; collectionId: number }>,
  documentElementToDocMap?: Map<number, number> // Optional mapping of element ID to document ID
): LinkedDocument[] => {
  const linkingAnnotationsFound = findLinkingAnnotationsForSelection(state, selection);
  const linkedDocuments: LinkedDocument[] = [];
  
  linkingAnnotationsFound.forEach((annotation: Annotation) => {
    if (!annotation.target || !Array.isArray(annotation.target)) {
      return;
    }
    
    annotation.target.forEach((target) => {
      // Skip the target that matches our current selection
      const targetSourceURI = target.source;
      if (targetSourceURI === selection.sourceURI) {
        return;
      }
      
      // Extract document element ID from sourceURI (format: "DocumentElements/123" or "/DocumentElements/123")
      const documentElementIdStr = targetSourceURI.replace(/^\/?(DocumentElements\/)/, '');
      const documentElementId = parseInt(documentElementIdStr);
      
      // Try to find which document this element belongs to
      let targetDocumentId: number | null = null;
      let targetDocumentTitle = 'Unknown Document';
      let targetCollectionId: number | null = null;
      
      // Method 1: Use provided mapping if available
      if (documentElementToDocMap && documentElementToDocMap.has(documentElementId)) {
        targetDocumentId = documentElementToDocMap.get(documentElementId)!;
      }
      
      // Method 2: Use the annotation's document_id
      if (!targetDocumentId && annotation.document_id) {
        // Check if this is different from our selection's document
        if (annotation.document_id !== selection.documentId) {
          targetDocumentId = annotation.document_id;
        }
      }
      
      // Method 3: For documents in our current view, try to infer
      if (!targetDocumentId) {
        // Find a document that's not our current selection's document
        const availableDocs = Array.from(documentsMap.values());
        const otherDoc = availableDocs.find(doc => doc.id !== selection.documentId);
        if (otherDoc) {
          targetDocumentId = otherDoc.id;
        }
      }
      
      // Method 4: Even if we don't have document info, show it as a linkable option
      if (!targetDocumentId) {
        // Use a placeholder ID that indicates unknown document
        targetDocumentId = -1;
        targetDocumentTitle = 'Linked Document (click to open)';
        targetCollectionId = 0;
      }
      
      // Get document info if available
      if (targetDocumentId !== -1 && documentsMap.has(targetDocumentId)) {
        const documentInfo = documentsMap.get(targetDocumentId)!;
        targetDocumentTitle = documentInfo.title;
        targetCollectionId = documentInfo.collectionId;
      }
      
      // Extract text from the target or annotation
      const linkedText = target.selector?.value || annotation.body.value || 'Linked text';
      
      linkedDocuments.push({
        documentId: targetDocumentId,
        documentTitle: targetDocumentTitle,
        linkedText: linkedText,
        linkingAnnotationId: annotation.id,
        targetInfo: {
          sourceURI: targetSourceURI,
          start: target.selector?.refined_by?.start || 0,
          end: target.selector?.refined_by?.end || 0,
        },
        collectionId: targetCollectionId || undefined
      });
    });
  });
  
  // Remove duplicates based on document ID
  const uniqueLinkedDocs = linkedDocuments.reduce((acc, current) => {
    const existing = acc.find(item => item.documentId === current.documentId);
    if (!existing) {
      acc.push(current);
    }
    return acc;
  }, [] as LinkedDocument[]);
  
  return uniqueLinkedDocs;
};

/**
 * Checks if a text selection has any linked text
 */
export const hasLinkedText = (
  state: RootState,
  selection: LinkedTextSelection
): boolean => {
  const linkingAnnotationsFound = findLinkingAnnotationsForSelection(state, selection);
  return linkingAnnotationsFound.length > 0;
};

/**
 * Creates a text selection object from DOM selection
 * ORIGINAL WORKING VERSION - minimal changes only
 */
export const createSelectionFromDOMSelection = (
    selection: Selection,
    documents: Array<{ id: number; title: string; collectionId: number }>
  ): LinkedTextSelection | null => {
    if (!selection || selection.rangeCount === 0) {
      return null;
    }
    
    const range = selection.getRangeAt(0);
    
    // Handle collapsed selection (just cursor position)
    let selectedText = range.toString().trim();
    
    // If no text is selected, try to get the word at cursor position
    if (selectedText.length === 0 && selection.isCollapsed) {
      // Get the text node and offset
      const textNode = range.startContainer;
      if (textNode.nodeType === Node.TEXT_NODE) {
        const fullText = textNode.textContent || '';
        const offset = range.startOffset;
        
        // Find word boundaries around the cursor
        let start = offset;
        let end = offset;
        
        // Go backwards to find start of word
        while (start > 0 && /\S/.test(fullText[start - 1])) {
          start--;
        }
        
        // Go forwards to find end of word
        while (end < fullText.length && /\S/.test(fullText[end])) {
          end++;
        }
        
        if (start < end) {
          selectedText = fullText.substring(start, end);
          // Update the range to cover the word
          range.setStart(textNode, start);
          range.setEnd(textNode, end);
        }
      }
    }
    
    if (selectedText.length === 0) {
      return null;
    }
    
    // Find which document element contains this selection
    let targetElement = range.commonAncestorContainer as Node;
    
    // Walk up the DOM tree to find the document element
    while (targetElement && targetElement.nodeType !== Node.ELEMENT_NODE) {
      targetElement = targetElement.parentNode!;
    }
    
    let elementWithId = targetElement as HTMLElement;
    while (elementWithId && !elementWithId.id?.startsWith('DocumentElements/')) {
      elementWithId = elementWithId.parentElement!;
    }
    
    if (!elementWithId) {
      return null;
    }
    
    // Extract document element ID - keep original logic
    const elementId = elementWithId.id.replace('DocumentElements/', '');
    
    // Find which document this belongs to
    const documentPanel = elementWithId.closest('.document-panel-wrapper') as HTMLElement;
    if (!documentPanel) {
      return null;
    }
    
    const documentId = parseInt(documentPanel.getAttribute('data-document-id') || '0');
    const document = documents.find(d => d.id === documentId);
    
    if (!document) {
      return null;
    }
    
    // Calculate text positions relative to the element
    const elementText = elementWithId.textContent || '';
    const rangeText = range.toString();
    const startOffset = elementText.indexOf(rangeText);
    const endOffset = startOffset + rangeText.length;
    
    return {
      documentId: document.id,
      documentElementId: parseInt(elementId),
      text: selectedText,
      start: startOffset,
      end: endOffset,
      sourceURI: `DocumentElements/${elementId}` // Keep original format for now
    };
};