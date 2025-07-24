// src/features/documentView/utils/scrollToTextUtils.ts

/**
 * Scrolls to a specific text element and highlights it
 * Enhanced to handle multi-element selections properly
 */
export const scrollToAndHighlightText = (targetInfo: {
  sourceURI: string;
  start: number;
  end: number;
}, allTargets?: Array<{
  sourceURI: string;
  start: number;
  end: number;
  text: string;
}>): void => {
  console.log('Scrolling to text with targetInfo:', targetInfo); // DEBUG
  console.log('All targets:', allTargets); // DEBUG
  
  // If we have multiple targets, highlight all of them
  const targetsToHighlight = allTargets && allTargets.length > 0 ? allTargets : [
    {
      sourceURI: targetInfo.sourceURI,
      start: targetInfo.start,
      end: targetInfo.end,
      text: '' // We don't have the text for single targets, but it's not needed for highlighting
    }
  ];
  
  console.log('Targets to highlight:', targetsToHighlight); // DEBUG
  
  // Validate that we have valid targets
  const validTargets = targetsToHighlight.filter(target => {
    const normalizedId = target.sourceURI.startsWith('/') ? 
      target.sourceURI.substring(1) : target.sourceURI;
    const element = document.getElementById(normalizedId);
    
    if (!element) {
      console.warn(`Target element not found: ${target.sourceURI} (normalized: ${normalizedId})`);
      return false;
    }
    
    // Validate the text range more robustly
    const textLength = element.textContent?.length || 0;
    
    // Check for obviously invalid ranges
    if (target.start < 0) {
      console.warn(`Invalid start position for ${target.sourceURI}: start=${target.start} (cannot be negative)`);
      return false;
    }
    
    if (target.end > textLength) {
      console.warn(`Invalid end position for ${target.sourceURI}: end=${target.end} > textLength=${textLength}`);
      return false;
    }
    
    if (target.start >= target.end) {
      console.warn(`Invalid range for ${target.sourceURI}: start=${target.start} >= end=${target.end}`);
      return false;
    }
    
    // Additional validation: check if the range makes sense
    if (target.end - target.start > textLength) {
      console.warn(`Range too large for ${target.sourceURI}: range=${target.end - target.start} > textLength=${textLength}`);
      return false;
    }
    
    console.log(`Valid target: ${target.sourceURI} [${target.start}-${target.end}] in text of length ${textLength}`);
    return true;
  });
  
  if (validTargets.length === 0) {
    console.warn('No valid targets found for highlighting');
    return;
  }
  
  console.log('Valid targets to highlight:', validTargets.length); // DEBUG
  
  // Find the first element to scroll to
  const primaryTarget = validTargets[0];
  const normalizedId = primaryTarget.sourceURI.startsWith('/') ? 
    primaryTarget.sourceURI.substring(1) : primaryTarget.sourceURI;
  
  console.log('Looking for primary element with normalized ID:', normalizedId); // DEBUG
  
  const primaryElement = document.getElementById(normalizedId);
  
  if (!primaryElement) {
    console.warn(`Primary target element not found: ${primaryTarget.sourceURI}`);
    return;
  }
  
  console.log('Found primary target element:', primaryElement); // DEBUG
  
  // Scroll to the primary element
  primaryElement.scrollIntoView({
    behavior: 'smooth',
    block: 'center',
    inline: 'nearest'
  });
  
  // Highlight all valid target elements with precise ranges
  setTimeout(() => {
    validTargets.forEach((target, index) => {
      const targetNormalizedId = target.sourceURI.startsWith('/') ? 
        target.sourceURI.substring(1) : target.sourceURI;
      
      const targetElement = document.getElementById(targetNormalizedId);
      
      if (targetElement) {
        console.log(`Highlighting element ${index + 1} (${targetNormalizedId}):`, {
          start: target.start,
          end: target.end,
          textLength: targetElement.textContent?.length || 0
        }); // DEBUG
        
        // Add a slight delay between highlights for visual effect
        setTimeout(() => {
          // Use precise highlighting for each target
          if (!createPreciseTextHighlight(targetElement, target.start, target.end)) {
            console.warn(`Precise highlighting failed for ${targetNormalizedId}, falling back to element highlight`);
            // Only highlight the whole element as last resort
            highlightWholeElement(targetElement);
          }
        }, index * 100);
      } else {
        console.warn(`Target element ${index + 1} not found:`, targetNormalizedId);
      }
    });
  }, 500); // Wait for scroll to complete
};

/**
* Multi-element highlighting function that can highlight across multiple elements
*/
export const highlightMultiElementText = (targets: Array<{
sourceURI: string;
start: number;
end: number;
text: string;
}>): void => {
console.log('Highlighting multi-element text:', targets); // DEBUG

targets.forEach((target, index) => {
  const normalizedId = target.sourceURI.startsWith('/') ? 
    target.sourceURI.substring(1) : target.sourceURI;
  
  const targetElement = document.getElementById(normalizedId);
  
  if (targetElement) {
    // Add a slight delay between highlights for visual effect
    setTimeout(() => {
      highlightTextRange(targetElement, target.start, target.end);
    }, index * 100);
  } else {
    console.warn(`Multi-element target not found:`, normalizedId);
  }
});
};

/**
* Highlights a specific text range within an element
*/
const highlightTextRange = (element: HTMLElement, start: number, end: number): void => {
const textContent = element.textContent || '';

console.log('Highlighting text range:', { start, end, textLength: textContent.length }); // DEBUG

if (start < 0 || end > textContent.length || start >= end) {
  console.warn('Invalid text range for highlighting:', { start, end, textLength: textContent.length });
  
  // If range is invalid, just highlight the whole element
  highlightWholeElement(element);
  return;
}

// Try precise highlighting first
if (createPreciseTextHighlight(element, start, end)) {
  return;
}

// Fallback to highlighting the whole element
highlightWholeElement(element);
};

/**
* Highlights the entire element as a fallback
*/
const highlightWholeElement = (element: HTMLElement): void => {
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
};

/**
* Creates a more precise text highlight using DOM ranges (enhanced version)
*/
export const createPreciseTextHighlight = (
element: HTMLElement, 
start: number, 
end: number
): boolean => {
const textContent = element.textContent || '';

console.log('createPreciseTextHighlight called:', { start, end, textLength: textContent.length }); // DEBUG

if (start < 0 || end > textContent.length || start >= end) {
  console.warn('Invalid range for precise highlighting:', { start, end, textLength: textContent.length });
  return false;
}

try {
  // Find the text nodes within the element
  const walker = window.document.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT,
    null
  );
  
  let currentOffset = 0;
  let startNode: Text | null = null;
  let endNode: Text | null = null;
  let startOffset = 0;
  let endOffset = 0;
  
  // Walk through text nodes to find start and end positions
  let textNode = walker.nextNode() as Text;
  while (textNode) {
    const nodeLength = textNode.textContent?.length || 0;
    const nodeEnd = currentOffset + nodeLength;
    
    // Check if start position is in this node
    if (!startNode && start >= currentOffset && start < nodeEnd) {
      startNode = textNode;
      startOffset = start - currentOffset;
    }
    
    // Check if end position is in this node
    if (end > currentOffset && end <= nodeEnd) {
      endNode = textNode;
      endOffset = end - currentOffset;
      break;
    }
    
    currentOffset = nodeEnd;
    textNode = walker.nextNode() as Text;
  }
  
  if (!startNode || !endNode) {
    console.warn('Could not find start/end text nodes');
    return false;
  }
  
  // Create range for the precise text
  const range = window.document.createRange();
  range.setStart(startNode, startOffset);
  range.setEnd(endNode, endOffset);
  
  console.log('Created precise range:', {
    startNodeText: startNode.textContent?.substring(0, 20) + '...',
    endNodeText: endNode.textContent?.substring(0, 20) + '...',
    startOffset,
    endOffset,
    rangeText: range.toString()
  }); // DEBUG
  
  // Create a temporary highlight span
  const highlightSpan = window.document.createElement('span');
  highlightSpan.style.backgroundColor = '#ffeb3b';
  highlightSpan.style.transition = 'background-color 0.3s ease';
  highlightSpan.style.padding = '2px 0';
  highlightSpan.className = 'temp-highlight';
  
  try {
    range.surroundContents(highlightSpan);
    
    console.log('Successfully created precise highlight'); // DEBUG
    
    // Remove highlight after delay
    setTimeout(() => {
      const parent = highlightSpan.parentNode;
      if (parent) {
        // Replace highlight span with its text content
        const textContent = highlightSpan.textContent || '';
        const textNode = window.document.createTextNode(textContent);
        parent.replaceChild(textNode, highlightSpan);
        
        // Normalize the parent to merge adjacent text nodes
        parent.normalize();
      }
    }, 2000);
    
    return true;
  } catch (rangeError) {
    console.warn('Range surroundContents failed:', rangeError);
    
    // Fallback: add a background highlight to the range
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
      
      // Apply highlight via CSS (temporary)
      setTimeout(() => {
        selection.removeAllRanges();
      }, 2000);
      
      return true;
    }
    
    return false;
  }
} catch (error) {
  console.warn('Precise highlighting failed:', error);  
  return false;
}
};

/**
* Checks if a document element is currently visible in the viewport
*/
export const isElementInViewport = (element: HTMLElement): boolean => {
const rect = element.getBoundingClientRect();
return (
  rect.top >= 0 &&
  rect.left >= 0 &&
  rect.bottom <= (window.innerHeight || window.document.documentElement.clientHeight) &&
  rect.right <= (window.innerWidth || window.document.documentElement.clientWidth)
);
};