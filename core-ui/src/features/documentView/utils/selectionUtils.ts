// src/utils/selectionUtils.ts

// Calculate the start offset of a selection range
export const getSelectionStartOffset = (range: Range): number => {
    const preSelectionRange = range.cloneRange();
    const element = range.startContainer.parentElement || document.body;
    preSelectionRange.selectNodeContents(element);
    preSelectionRange.setEnd(range.startContainer, range.startOffset);
    return preSelectionRange.toString().length;
  };
  
  // Calculate the end offset of a selection range
  export const getSelectionEndOffset = (range: Range): number => {
    const preSelectionRange = range.cloneRange();
    const element = range.endContainer.parentElement || document.body;
    preSelectionRange.selectNodeContents(element);
    preSelectionRange.setEnd(range.endContainer, range.endOffset);
    return preSelectionRange.toString().length;
  };
  
  // Check if a range intersects with an element
  export const rangeIntersectsElement = (range: Range, element: HTMLElement): boolean => {
    const elementRange = document.createRange();
    elementRange.selectNodeContents(element);
    
    return range.compareBoundaryPoints(Range.END_TO_START, elementRange) <= 0 &&
           range.compareBoundaryPoints(Range.START_TO_END, elementRange) >= 0;
  };
  
  // Calculate the segment details for a paragraph
  export const calculateSegmentForParagraph = (
    range: Range, 
    paragraphElement: HTMLElement
  ) => {
    const elementRange = document.createRange();
    elementRange.selectNodeContents(paragraphElement);
    
    // Create a range that represents the intersection
    const intersectionRange = document.createRange();
    
    // Set start point
    if (range.compareBoundaryPoints(Range.START_TO_START, elementRange) <= 0) {
      // Selection starts before this paragraph
      intersectionRange.setStart(elementRange.startContainer, elementRange.startOffset);
    } else {
      // Selection starts within this paragraph
      intersectionRange.setStart(range.startContainer, range.startOffset);
    }
    
    // Set end point
    if (range.compareBoundaryPoints(Range.END_TO_END, elementRange) >= 0) {
      // Selection ends after this paragraph
      intersectionRange.setEnd(elementRange.endContainer, elementRange.endOffset);
    } else {
      // Selection ends within this paragraph
      intersectionRange.setEnd(range.endContainer, range.endOffset);
    }
    
    // Calculate offsets
    const start = getSelectionStartOffset(intersectionRange);
    const end = getSelectionEndOffset(intersectionRange);
    
    // Get the selected text for this segment
    const selectedText = intersectionRange.toString();
    
    return { start, end, selectedText };
  };