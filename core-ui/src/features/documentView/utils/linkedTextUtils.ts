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
  // New: Support for multi-element selections
  allTargets?: Array<{
    sourceURI: string;
    start: number;
    end: number;
    text: string;
  }>;
}

/**
 * Helper function to safely extract numeric ID from element ID string
 */
const extractNumericId = (fullId: string): string | null => {
  console.log('Extracting numeric ID from:', fullId);
  
  let elementId: string;
  
  if (fullId.startsWith('DocumentElements/')) {
    elementId = fullId.substring('DocumentElements/'.length);
  } else if (fullId.includes('/DocumentElements/')) {
    const match = fullId.match(/\/DocumentElements\/(\d+)$/);
    elementId = match ? match[1] : '';
  } else {
    console.warn('Unexpected element ID format in selection:', fullId);
    return null;
  }
  
  // Validate that we got a valid numeric ID
  if (!elementId || isNaN(parseInt(elementId))) {
    console.warn('Invalid numeric ID extracted:', { fullId, elementId });
    return null;
  }
  
  console.log('Successfully extracted numeric ID:', { fullId, elementId });
  return elementId;
};

/**
 * Finds all linking annotations that contain the given text selection
 * Enhanced to handle multi-element selections
 */
export const findLinkingAnnotationsForSelection = (
  state: RootState,
  selection: LinkedTextSelection
): Annotation[] => {
  try {
    // Get all linking annotations using the correct selector
    const allLinkingAnnotations = linkingAnnotations.selectors.selectAllAnnotations(state);
    
    console.log('Finding linking annotations for selection:', selection); // DEBUG
    console.log('All linking annotations:', allLinkingAnnotations.length); // DEBUG
    
    // Filter annotations that contain a target matching our selection
    const matchingAnnotations = allLinkingAnnotations.filter((annotation: Annotation) => {
      if (!annotation.target || !Array.isArray(annotation.target)) {
        return false;
      }
      
      // For multi-element annotations, check if ANY target matches our selection
      const hasMatchingTarget = annotation.target.some((target) => {
        const targetSourceURI = target.source;
        const selectionSourceURI = selection.sourceURI;
        
        console.log('Checking target:', { targetSourceURI, selectionSourceURI }); // DEBUG
        
        if (targetSourceURI !== selectionSourceURI) {
          return false;
        }
        
        // Check if the text ranges overlap
        const targetStart = target.selector?.refined_by?.start;
        const targetEnd = target.selector?.refined_by?.end;
        
        console.log('Range check:', { 
          targetStart, 
          targetEnd, 
          selectionStart: selection.start, 
          selectionEnd: selection.end 
        }); // DEBUG
        
        if (targetStart === undefined || targetEnd === undefined) {
          return false;
        }
        
        // Check for overlap between selection and target
        const hasOverlap = !(selection.end <= targetStart || selection.start >= targetEnd);
        console.log('Has overlap:', hasOverlap); // DEBUG
        
        return hasOverlap;
      });
      
      return hasMatchingTarget;
    });
    
    console.log('Matching annotations found:', matchingAnnotations.length); // DEBUG
    return matchingAnnotations;
  } catch (error) {
    console.warn('Error finding linking annotations:', error);
    return [];
  }
};

/**
 * Extracts linked documents from linking annotations for a given selection
 * Enhanced to work with multi-element selections and provide complete target info
 */
export const getLinkedDocumentsForSelection = (
  state: RootState,
  selection: LinkedTextSelection,
  documentsMap: Map<number, { id: number; title: string; collectionId: number }>,
  documentElementToDocMap?: Map<number, number> // Optional mapping of element ID to document ID
): LinkedDocument[] => {
  const linkingAnnotationsFound = findLinkingAnnotationsForSelection(state, selection);
  const linkedDocuments: LinkedDocument[] = [];
  
  console.log(`Processing ${linkingAnnotationsFound.length} linking annotations`); // DEBUG
  
  linkingAnnotationsFound.forEach((annotation: Annotation, annoIndex) => {
    console.log(`Processing annotation ${annoIndex}:`, annotation.id); // DEBUG
    
    if (!annotation.target || !Array.isArray(annotation.target)) {
      console.log(`Annotation ${annotation.id} has no targets`); // DEBUG
      return;
    }
    
    console.log(`Annotation ${annotation.id} has ${annotation.target.length} targets`); // DEBUG
    
    // Group targets by document to handle multi-element selections
    const targetsByDocument = new Map<number, typeof annotation.target>();
    
    annotation.target.forEach((target, targetIndex) => {
      console.log(`Processing target ${targetIndex}:`, {
        sourceURI: target.source,
        start: target.selector?.refined_by?.start,
        end: target.selector?.refined_by?.end
      }); // DEBUG
      
      // Skip the target that matches our current selection
      const targetSourceURI = target.source;
      if (targetSourceURI === selection.sourceURI) {
        console.log(`Skipping target ${targetIndex} - matches current selection`); // DEBUG
        return;
      }
      
      // Extract document element ID from sourceURI (format: "/DocumentElements/123")
      const elementIdMatch = targetSourceURI.match(/\/DocumentElements\/(\d+)/);
      if (!elementIdMatch) {
        console.log(`Target ${targetIndex} has invalid sourceURI format:`, targetSourceURI); // DEBUG
        return;
      }
      
      const documentElementId = parseInt(elementIdMatch[1]);
      console.log(`Target ${targetIndex} element ID:`, documentElementId); // DEBUG
      
      // Try to find which document this element belongs to
      let targetDocumentId: number | null = null;
      
      // Method 1: Use provided mapping if available
      if (documentElementToDocMap && documentElementToDocMap.has(documentElementId)) {
        targetDocumentId = documentElementToDocMap.get(documentElementId)!;
        console.log(`Found document ID via mapping: ${targetDocumentId}`); // DEBUG
      }
      
      // Method 2: Use the annotation's document_id
      if (!targetDocumentId && annotation.document_id) {
        // Check if this is different from our selection's document
        if (annotation.document_id !== selection.documentId) {
          targetDocumentId = annotation.document_id;
          console.log(`Found document ID via annotation: ${targetDocumentId}`); // DEBUG
        }
      }
      
      // Method 3: For documents in our current view, try to infer
      if (!targetDocumentId) {
        // Find a document that's not our current selection's document
        const availableDocs = Array.from(documentsMap.values());
        const otherDoc = availableDocs.find(doc => doc.id !== selection.documentId);
        if (otherDoc) {
          targetDocumentId = otherDoc.id;
          console.log(`Found document ID via inference: ${targetDocumentId}`); // DEBUG
        }
      }
      
      if (targetDocumentId) {
        // Group targets by document
        if (!targetsByDocument.has(targetDocumentId)) {
          targetsByDocument.set(targetDocumentId, []);
        }
        targetsByDocument.get(targetDocumentId)!.push(target);
        console.log(`Added target to document ${targetDocumentId} group`); // DEBUG
      } else {
        console.log(`Could not determine document ID for target ${targetIndex}`); // DEBUG
      }
    });
    
    console.log(`Grouped targets by document:`, Array.from(targetsByDocument.keys())); // DEBUG
    
    // Create linked documents from grouped targets
    targetsByDocument.forEach((targets, targetDocumentId) => {
      console.log(`Creating linked document for document ${targetDocumentId} with ${targets.length} targets`); // DEBUG
      
      let targetDocumentTitle = 'Unknown Document';
      let targetCollectionId: number | null = null;
      
      // Get document info if available
      if (documentsMap.has(targetDocumentId)) {
        const documentInfo = documentsMap.get(targetDocumentId)!;
        targetDocumentTitle = documentInfo.title;
        targetCollectionId = documentInfo.collectionId;
      }
      
      // Combine text from all targets for this document
      const combinedText = targets.map(target => 
        target.selector?.value || 'Linked text'
      ).join(' ... ');
      
      // For multi-element selections, we need to provide info about all target elements
      const primaryTarget = targets[0];
      
      const allTargets = targets.map(target => ({
        sourceURI: target.source,
        start: target.selector?.refined_by?.start || 0,
        end: target.selector?.refined_by?.end || 0,
        text: target.selector?.value || 'Linked text'
      }));
      
      console.log(`Created allTargets array:`, allTargets); // DEBUG
      
      linkedDocuments.push({
        documentId: targetDocumentId,
        documentTitle: targetDocumentTitle,
        linkedText: combinedText,
        linkingAnnotationId: annotation.id,
        targetInfo: {
          sourceURI: primaryTarget.source,
          start: primaryTarget.selector?.refined_by?.start || 0,
          end: primaryTarget.selector?.refined_by?.end || 0,
        },
        collectionId: targetCollectionId || undefined,
        // Add additional info for multi-element selections
        allTargets: allTargets
      });
    });
  });
  
  // Remove duplicates based on document ID and annotation ID
  const uniqueLinkedDocs = linkedDocuments.reduce((acc, current) => {
    const existing = acc.find(item => 
      item.documentId === current.documentId && 
      item.linkingAnnotationId === current.linkingAnnotationId
    );
    if (!existing) {
      acc.push(current);
    }
    return acc;
  }, [] as LinkedDocument[]);
  
  console.log(`Final linked documents:`, uniqueLinkedDocs.map(doc => ({
    documentId: doc.documentId,
    title: doc.documentTitle,
    allTargetsCount: doc.allTargets?.length || 0
  }))); // DEBUG
  
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
 * FIXED VERSION - matches the format used in DocumentLinkingOverlay
 */
export const createSelectionFromDOMSelection = (
    selection: Selection,
    documents: Array<{ id: number; title: string; collectionId: number }>
  ): LinkedTextSelection | null => {
    console.log('Creating selection from DOM, documents:', documents.map(d => ({ id: d.id, title: d.title }))); // DEBUG
    
    if (!selection || selection.rangeCount === 0) {
      console.log('No selection or no ranges'); // DEBUG
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
      console.log('No selected text'); // DEBUG
      return null;
    }
    
    console.log('Selected text:', selectedText.substring(0, 50) + (selectedText.length > 50 ? '...' : '')); // DEBUG
    
    // Find which document element contains this selection
    let targetElement = range.commonAncestorContainer as Node;
    
    // Walk up the DOM tree to find the document element
    while (targetElement && targetElement.nodeType !== Node.ELEMENT_NODE) {
      targetElement = targetElement.parentNode!;
    }
    
    let elementWithId = targetElement as HTMLElement;
    let searchDepth = 0;
    console.log('Starting element search from:', elementWithId?.tagName, elementWithId?.id, elementWithId?.className); // DEBUG
    
    while (elementWithId && !elementWithId.id?.includes('DocumentElements') && searchDepth < 20) {
      console.log(`Search depth ${searchDepth}:`, elementWithId.tagName, elementWithId.id, elementWithId.className); // DEBUG
      elementWithId = elementWithId.parentElement!;
      searchDepth++;
    }
    
    console.log('Found element with ID:', elementWithId?.id); // DEBUG
    
    if (!elementWithId || !elementWithId.id?.includes('DocumentElements')) {
      console.log('No document element found'); // DEBUG
      return null;
    }
    
    // Extract document element ID using the safe extraction function
    const elementId = extractNumericId(elementWithId.id);
    
    if (!elementId) {
      console.log('Could not extract valid element ID from:', elementWithId.id); // DEBUG
      return null;
    }
    
    console.log('Extracted element ID:', elementId); // DEBUG
    
    // Find which document this belongs to
    const documentPanel = elementWithId.closest('.document-panel-wrapper') as HTMLElement;
    if (!documentPanel) {
      console.log('No document panel found'); // DEBUG
      return null;
    }
    
    const documentId = parseInt(documentPanel.getAttribute('data-document-id') || '0');
    const foundDocument = documents.find(d => d.id === documentId);
    
    console.log('Document lookup:', { 
      documentId, 
      foundDocument: foundDocument ? { id: foundDocument.id, title: foundDocument.title } : null,
      availableDocuments: documents.map(d => d.id)
    }); // DEBUG
    
    if (!foundDocument) {
      console.log('Document not found in list'); // DEBUG
      return null;
    }
    
    // Calculate text positions relative to the element
    const elementText = elementWithId.textContent || '';
    const rangeText = range.toString();
    
    // Find the start position of the selected text within the element
    let startOffset = elementText.indexOf(rangeText);
    let endOffset = startOffset + rangeText.length;
    
    // If direct match fails, try with trimmed text
    if (startOffset === -1) {
      const trimmedRangeText = rangeText.trim();
      startOffset = elementText.indexOf(trimmedRangeText);
      if (startOffset !== -1) {
        endOffset = startOffset + trimmedRangeText.length;
      } else {
        // Last resort: try with first part of the text
        const firstPart = rangeText.substring(0, Math.min(50, rangeText.length));
        startOffset = elementText.indexOf(firstPart);
        if (startOffset !== -1) {
          endOffset = startOffset + firstPart.length;
        } else {
          console.warn('Could not find selected text within element');
          startOffset = 0;
          endOffset = rangeText.length;
        }
      }
    }
    
    console.log('Text position calculation:', { 
      elementTextLength: elementText.length,
      elementTextPreview: elementText.substring(0, 100) + '...', 
      rangeText: rangeText.substring(0, 50) + '...',
      startOffset, 
      endOffset,
      isValidRange: startOffset >= 0 && endOffset <= elementText.length && startOffset < endOffset
    }); // DEBUG
    
    const result = {
      documentId: foundDocument.id,
      documentElementId: parseInt(elementId),
      text: selectedText,
      start: startOffset,
      end: endOffset,
      sourceURI: `/DocumentElements/${elementId}` // Consistent format with leading slash
    };
    
    console.log('Created selection:', result); // DEBUG
    return result;
};