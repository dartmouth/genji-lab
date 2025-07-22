// src/features/documentView/utils/scrollToTextUtils.ts

/**
 * Scrolls to a specific text element and highlights it
 */
export const scrollToAndHighlightText = (targetInfo: {
    sourceURI: string;
    start: number;
    end: number;
  }): void => {
    const { sourceURI, start, end } = targetInfo;
    
    // Find the target element by its ID
    const targetElement = document.getElementById(sourceURI);
    
    if (!targetElement) {
      console.warn(`Target element not found: ${sourceURI}`);
      return;
    }
    
    // Scroll the element into view
    targetElement.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'nearest'
    });
    
    // Highlight the specific text range within the element
    setTimeout(() => {
      highlightTextRange(targetElement, start, end);
    }, 500); // Wait for scroll to complete
  };
  
  /**
   * Highlights a specific text range within an element
   */
  const highlightTextRange = (element: HTMLElement, start: number, end: number): void => {
    const textContent = element.textContent || '';
    
    if (start < 0 || end > textContent.length || start >= end) {
      console.warn('Invalid text range for highlighting');
      return;
    }
    
    // Create a temporary highlight effect
    const originalBackgroundColor = element.style.backgroundColor;
    const originalTransition = element.style.transition;
    
    // Apply highlight
    element.style.transition = 'background-color 0.3s ease';
    element.style.backgroundColor = '#ffeb3b'; // Yellow highlight
    
    // Remove highlight after a delay
    setTimeout(() => {
      element.style.backgroundColor = originalBackgroundColor;
      setTimeout(() => {
        element.style.transition = originalTransition;
      }, 300);
    }, 2000);
    
    // For more precise highlighting, we could create a selection or use mark.js
    // but for now, highlighting the entire element provides good visual feedback
  };
  
  /**
   * Creates a more precise text highlight using DOM ranges (optional enhancement)
   */
  export const createPreciseTextHighlight = (
    element: HTMLElement, 
    start: number, 
    end: number
  ): void => {
    const textContent = element.textContent || '';
    
    if (start < 0 || end > textContent.length || start >= end) {
      return;
    }
    
    try {
      const range = document.createRange();
      const textNode = findTextNode(element);
      
      if (textNode) {
        range.setStart(textNode, start);
        range.setEnd(textNode, end);
        
        // Create a temporary highlight span
        const highlightSpan = document.createElement('span');
        highlightSpan.style.backgroundColor = '#ffeb3b';
        highlightSpan.style.transition = 'background-color 0.3s ease';
        highlightSpan.className = 'temp-highlight';
        
        try {
          range.surroundContents(highlightSpan);
          
          // Remove highlight after delay
          setTimeout(() => {
            const parent = highlightSpan.parentNode;
            if (parent) {
              parent.insertBefore(document.createTextNode(highlightSpan.textContent || ''), highlightSpan);
              parent.removeChild(highlightSpan);
            }
          }, 2000);
        } catch (rangeError) {
          // Fallback to element-level highlighting if range operation fails
          console.warn('Range operation failed, falling back to element highlighting:', rangeError);
          highlightTextRange(element, start, end);
        }
      }
    } catch (error) {
      // Fallback to element-level highlighting
      console.warn('Precise highlighting failed, falling back to element highlighting:', error);
      highlightTextRange(element, start, end);
    }
  };
  
  /**
   * Finds the first text node within an element
   */
  const findTextNode = (element: HTMLElement): Text | null => {
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null
    );
    
    return walker.nextNode() as Text | null;
  };
  
  /**
   * Checks if a document element is currently visible in the viewport
   */
  export const isElementInViewport = (element: HTMLElement): boolean => {
    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  };