// src/features/documentView/utils/scrollToTextUtils.ts
// CRITICAL FIXES - Robust TypeScript handling and element detection

/**
 * Type guard to check if an element is a valid HTMLElement
 */
const isValidHTMLElement = (element: any): element is HTMLElement => {
  return element && 
         typeof element === 'object' && 
         'getBoundingClientRect' in element &&
         'scrollIntoView' in element &&
         typeof element.getBoundingClientRect === 'function';
};

/**
 * Checks if a document element is currently visible in the viewport
 */
export const isElementInViewport = (element: any): boolean => {
  if (!isValidHTMLElement(element)) {
    return false;
  }
  
  try {
    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  } catch {
    return false;
  }
};

/**
 * Safe scrolling with viewport checking
 */
const scrollToElementSafely = (element: any): void => {
  try {
    if (!isValidHTMLElement(element)) {
      console.error('🎯 ❌ Invalid element passed to scrollToElementSafely');
      return;
    }
    
    // Check if element is already in viewport
    if (isElementInViewport(element)) {
      console.log('🎯 📜 Element already in viewport, not scrolling');
      return;
    }
    
    // Use scrollIntoView
    if (typeof element.scrollIntoView === 'function') {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      });
      console.log('🎯 📜 Scrolled using scrollIntoView');
    } else {
      // Fallback for older browsers
      try {
        const rect = element.getBoundingClientRect();
        const scrollTop = window.pageYOffset + rect.top - (window.innerHeight / 2);
        window.scrollTo({
          top: scrollTop,
          behavior: 'smooth'
        });
        console.log('🎯 📜 Scrolled using fallback method');
      } catch (error) {
        console.error('🎯 ❌ getBoundingClientRect failed:', error);
      }
    }
  } catch (error) {
    console.error('🎯 ❌ Scroll error:', error);
  }
};

/**
 * Multiple strategies to find elements by sourceURI
 */
const findElementByMultipleStrategies = (sourceURI: string): HTMLElement | null => {
  console.log('🔍 Finding element for sourceURI:', sourceURI);
  
  try {
    // Strategy 1: Direct ID lookup (most common)
    const normalizedId = sourceURI.startsWith('/') ? sourceURI.substring(1) : sourceURI;
    let element: Element | null = document.getElementById(normalizedId);
    if (isValidHTMLElement(element)) {
      console.log('🔍 ✅ Found via direct ID:', normalizedId);
      return element;
    }
    
    // Strategy 2: querySelector with exact ID
    element = document.querySelector(`#${CSS.escape(normalizedId)}`);
    if (isValidHTMLElement(element)) {
      console.log('🔍 ✅ Found via querySelector:', normalizedId);
      return element;
    }
    
    // Strategy 3: Look for data attributes
    const elementId = sourceURI.split('/').pop();
    if (elementId) {
      element = document.querySelector(`[data-element-id="${elementId}"]`);
      if (isValidHTMLElement(element)) {
        console.log('🔍 ✅ Found via data-element-id:', elementId);
        return element;
      }
      
      element = document.querySelector(`[data-source-uri="${sourceURI}"]`);
      if (isValidHTMLElement(element)) {
        console.log('🔍 ✅ Found via data-source-uri:', sourceURI);
        return element;
      }
    }
    
    // Strategy 4: Partial match (last resort)
    const elements = Array.from(document.querySelectorAll('[id*="DocumentElements"]'));
    for (const el of elements) {
      if (isValidHTMLElement(el) && el.id.includes(elementId || '')) {
        console.log('🔍 ⚠️ Found via partial match:', el.id);
        return el;
      }
    }
    
    console.log('🔍 ❌ Element not found with any strategy');
    return null;
  } catch (error) {
    console.error('🔍 ❌ Error finding element:', error);
    return null;
  }
};

/**
 * Scrolls to a specific text element and highlights it
 * Enhanced to handle multi-element selections properly with better timing
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
  console.log('🎯 === scrollToAndHighlightText called ===');
  console.log('🎯 Target info:', targetInfo);
  console.log('🎯 All targets:', allTargets?.length || 0);
  
  // Wait for DOM to be fully ready
  const executeWithRetry = (attempt: number = 1, maxAttempts: number = 5): void => {
    console.log(`🎯 Attempt ${attempt}/${maxAttempts} to find target elements`);
    
    // If we have multiple targets, highlight all of them
    const targetsToHighlight = allTargets && allTargets.length > 0 ? allTargets : [
      {
        sourceURI: targetInfo.sourceURI,
        start: targetInfo.start,
        end: targetInfo.end,
        text: ''
      }
    ];
    
    console.log('🎯 Targets to highlight:', targetsToHighlight.map(t => ({ 
      uri: t.sourceURI, 
      range: `${t.start}-${t.end}` 
    })));
    
    // Find valid targets
    const validTargets = targetsToHighlight.filter(target => {
      const element = findElementByMultipleStrategies(target.sourceURI);
      
      if (!element) {
        console.warn(`🎯 Target element not found (attempt ${attempt}): ${target.sourceURI}`);
        return false;
      }
      
      // Validate the text range
      const textLength = element.textContent?.length || 0;
      
      if (target.start < 0 || target.end > textLength || target.start >= target.end) {
        console.warn(`🎯 Invalid range for ${target.sourceURI}: [${target.start}-${target.end}] in text of length ${textLength}`);
        return false;
      }
      
      console.log(`🎯 ✅ Valid target: ${target.sourceURI} [${target.start}-${target.end}] in text of length ${textLength}`);
      return true;
    });
    
    if (validTargets.length === 0) {
      if (attempt < maxAttempts) {
        console.log(`🎯 No valid targets found, retrying in ${attempt * 500}ms...`);
        setTimeout(() => executeWithRetry(attempt + 1, maxAttempts), attempt * 500);
        return;
      } else {
        console.error('🎯 ❌ No valid targets found after all attempts');
        return;
      }
    }
    
    console.log(`🎯 ✅ Found ${validTargets.length} valid targets on attempt ${attempt}`);
    
    // Find the first element to scroll to
    const primaryTarget = validTargets[0];
    const primaryElement = findElementByMultipleStrategies(primaryTarget.sourceURI);
    
    if (!primaryElement) {
      console.error(`🎯 ❌ Primary target element lost: ${primaryTarget.sourceURI}`);
      return;
    }
    
    console.log('🎯 📜 Scrolling to primary element:', primaryElement);
    
    // Scroll to element
    scrollToElementSafely(primaryElement);
    
    // Highlight all valid targets with staggered timing
    setTimeout(() => {
      console.log('🎯 🌟 Starting highlighting sequence');
      validTargets.forEach((target, index) => {
        const targetElement = findElementByMultipleStrategies(target.sourceURI);
        
        if (targetElement) {
          console.log(`🎯 Highlighting element ${index + 1}/${validTargets.length} (${target.sourceURI}):`, {
            start: target.start,
            end: target.end,
            textLength: targetElement.textContent?.length || 0
          });
          
          setTimeout(() => {
            if (!createPreciseTextHighlight(targetElement, target.start, target.end)) {
              console.warn(`🎯 Precise highlighting failed for ${target.sourceURI}, using fallback`);
              highlightWholeElement(targetElement);
            }
          }, index * 150);
        } else {
          console.warn(`🎯 Target element ${index + 1} not found during highlighting:`, target.sourceURI);
        }
      });
    }, 800);
  };
  
  // Start the execution with retry logic
  executeWithRetry();
};

/**
 * Multi-element highlighting function
 */
export const highlightMultiElementText = (targets: Array<{
  sourceURI: string;
  start: number;
  end: number;
  text: string;
}>): void => {
  console.log('🌟 Highlighting multi-element text:', targets);

  targets.forEach((target, index) => {
    const targetElement = findElementByMultipleStrategies(target.sourceURI);
    
    if (targetElement) {
      setTimeout(() => {
        highlightTextRange(targetElement, target.start, target.end);
      }, index * 100);
    } else {
      console.warn(`🌟 Multi-element target not found:`, target.sourceURI);
    }
  });
};

/**
 * Highlights a specific text range within an element
 */
const highlightTextRange = (element: HTMLElement, start: number, end: number): void => {
  const textContent = element.textContent || '';

  console.log('🌟 Highlighting text range:', { start, end, textLength: textContent.length });

  if (start < 0 || end > textContent.length || start >= end) {
    console.warn('🌟 Invalid text range for highlighting:', { start, end, textLength: textContent.length });
    highlightWholeElement(element);
    return;
  }

  if (!createPreciseTextHighlight(element, start, end)) {
    highlightWholeElement(element);
  }
};

/**
 * Highlights the entire element as a fallback with better styling
 */
const highlightWholeElement = (element: HTMLElement): void => {
  console.log('🌟 Applying whole element highlight');
  
  const originalBackgroundColor = element.style.backgroundColor;
  const originalTransition = element.style.transition;
  const originalBoxShadow = element.style.boxShadow;

  // Apply highlight with more visible styling
  element.style.transition = 'all 0.3s ease';
  element.style.backgroundColor = '#ffeb3b';
  element.style.boxShadow = '0 0 10px rgba(255, 235, 59, 0.5)';
  element.style.borderRadius = '4px';

  // Pulse effect
  setTimeout(() => {
    element.style.backgroundColor = '#fff176';
  }, 300);

  setTimeout(() => {
    element.style.backgroundColor = '#ffeb3b';
  }, 600);

  // Remove highlight after a delay
  setTimeout(() => {
    element.style.backgroundColor = originalBackgroundColor;
    element.style.boxShadow = originalBoxShadow;
    setTimeout(() => {
      element.style.transition = originalTransition;
    }, 300);
  }, 2500);
};

/**
 * Creates a more precise text highlight using DOM ranges
 */
export const createPreciseTextHighlight = (
  element: HTMLElement, 
  start: number, 
  end: number
): boolean => {
  const textContent = element.textContent || '';

  console.log('🌟 createPreciseTextHighlight called:', { start, end, textLength: textContent.length });

  if (start < 0 || end > textContent.length || start >= end) {
    console.warn('🌟 Invalid range for precise highlighting:', { start, end, textLength: textContent.length });
    return false;
  }

  try {
    // Find the text nodes within the element
    const walker = document.createTreeWalker(
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
      console.warn('🌟 Could not find start/end text nodes');
      return false;
    }
    
    // Create range for the precise text
    const range = document.createRange();
    range.setStart(startNode, startOffset);
    range.setEnd(endNode, endOffset);
    
    console.log('🌟 Created precise range:', {
      startNodeText: startNode.textContent?.substring(0, 20) + '...',
      endNodeText: endNode.textContent?.substring(0, 20) + '...',
      startOffset,
      endOffset,
      rangeText: range.toString().substring(0, 50) + '...'
    });
    
    // Create a temporary highlight span with enhanced styling
    const highlightSpan = document.createElement('span');
    highlightSpan.style.backgroundColor = '#ffeb3b';
    highlightSpan.style.transition = 'all 0.3s ease';
    highlightSpan.style.padding = '2px 4px';
    highlightSpan.style.borderRadius = '3px';
    highlightSpan.style.boxShadow = '0 0 8px rgba(255, 235, 59, 0.6)';
    highlightSpan.className = 'temp-highlight';
    
    try {
      range.surroundContents(highlightSpan);
      
      console.log('🌟 ✅ Successfully created precise highlight');
      
      // Pulse effect for precise highlights
      setTimeout(() => {
        highlightSpan.style.backgroundColor = '#fff176';
      }, 300);
      
      setTimeout(() => {
        highlightSpan.style.backgroundColor = '#ffeb3b';
      }, 600);
      
      // Remove highlight after delay
      setTimeout(() => {
        const parent = highlightSpan.parentNode;
        if (parent) {
          const textContent = highlightSpan.textContent || '';
          const textNode = document.createTextNode(textContent);
          parent.replaceChild(textNode, highlightSpan);
          parent.normalize();
        }
      }, 3000);
      
      return true;
    } catch (rangeError) {
      console.warn('🌟 Range surroundContents failed:', rangeError);
      
      // Fallback: use selection API
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
        
        setTimeout(() => {
          selection.removeAllRanges();
        }, 2500);
        
        return true;
      }
      
      return false;
    }
  } catch (error) {
    console.warn('🌟 Precise highlighting failed:', error);  
    return false;
  }
};