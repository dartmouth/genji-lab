// src/features/documentView/utils/scrollToTextUtils.ts
// ENHANCED: Navigation highlighting that modifies existing red link indicators

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
 * Multiple strategies to find elements by sourceURI with enhanced debugging
 */
const findElementByMultipleStrategies = (sourceURI: string): HTMLElement | null => {
  console.log('🔍 === ENHANCED ELEMENT SEARCH ===');
  console.log('🔍 Searching for sourceURI:', sourceURI);
  
  try {
    // Strategy 1: Direct ID lookup (most common)
    const normalizedId = sourceURI.startsWith('/') ? sourceURI.substring(1) : sourceURI;
    console.log('🔍 Strategy 1 - Direct ID lookup:', normalizedId);
    
    let element: Element | null = document.getElementById(normalizedId);
    if (isValidHTMLElement(element)) {
      console.log('🔍 ✅ Found via direct ID:', normalizedId);
      
      // Verify it's in a visible document panel
      const documentPanel = element.closest('[data-document-id]');
      if (documentPanel) {
        const docId = documentPanel.getAttribute('data-document-id');
        console.log('🔍 ✅ Element is in document panel:', docId);
        return element;
      } else {
        console.log('🔍 ⚠️ Element found but not in a document panel');
      }
    }
    
    // Strategy 2: querySelector with exact ID
    console.log('🔍 Strategy 2 - CSS escaped selector');
    element = document.querySelector(`#${CSS.escape(normalizedId)}`);
    if (isValidHTMLElement(element)) {
      console.log('🔍 ✅ Found via querySelector:', normalizedId);
      const documentPanel = element.closest('[data-document-id]');
      if (documentPanel) {
        const docId = documentPanel.getAttribute('data-document-id');
        console.log('🔍 ✅ Element is in document panel:', docId);
        return element;
      }
    }
    
    // Strategy 3: Look for data attributes
    console.log('🔍 Strategy 3 - Data attributes');
    const elementId = sourceURI.split('/').pop();
    if (elementId) {
      console.log('🔍 Extracted element ID:', elementId);
      
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
    
    // Strategy 4: Search within specific document panels
    console.log('🔍 Strategy 4 - Document panel specific search');
    const documentPanels = document.querySelectorAll('[data-document-id]');
    console.log(`🔍 Found ${documentPanels.length} document panels`);
    
    for (const panel of documentPanels) {
      const docId = panel.getAttribute('data-document-id');
      console.log(`🔍 Searching in document panel: ${docId}`);
      
      // Try to find the element within this panel
      const elementInPanel = panel.querySelector(`#${CSS.escape(normalizedId)}`);
      if (elementInPanel && isValidHTMLElement(elementInPanel)) {
        console.log(`🔍 ✅ Found element in document panel ${docId}:`, elementInPanel.id);
        return elementInPanel;
      }
      
      // Try with element ID if we have it
      if (elementId) {
        const elementById = panel.querySelector(`[id*="${elementId}"]`);
        if (elementById && isValidHTMLElement(elementById) && elementById.id.includes('DocumentElements')) {
          console.log(`🔍 ✅ Found element by partial ID in document panel ${docId}:`, elementById.id);
          return elementById;
        }
      }
    }
    
    // Strategy 5: Partial match (last resort)
    console.log('🔍 Strategy 5 - Partial match fallback');
    const elements = Array.from(document.querySelectorAll('[id*="DocumentElements"]'));
    console.log(`🔍 Found ${elements.length} DocumentElements in DOM`);
    
    for (const el of elements) {
      if (isValidHTMLElement(el) && el.id.includes(elementId || '')) {
        console.log('🔍 ⚠️ Found via partial match:', el.id);
        
        // Verify it's in a document panel
        const documentPanel = el.closest('[data-document-id]');
        if (documentPanel) {
          const docId = documentPanel.getAttribute('data-document-id');
          console.log('🔍 ✅ Partial match element is in document panel:', docId);
          return el;
        }
      }
    }
    
    console.log('🔍 ❌ Element not found with any strategy');
    console.log('🔍 Debug info:');
    console.log('🔍 - Source URI:', sourceURI);
    console.log('🔍 - Normalized ID:', normalizedId);
    console.log('🔍 - Element ID:', elementId);
    console.log('🔍 - Document panels:', documentPanels.length);
    console.log('🔍 - Total DocumentElements:', document.querySelectorAll('[id*="DocumentElements"]').length);
    
    return null;
  } catch (error) {
    console.error('🔍 ❌ Error finding element:', error);
    return null;
  }
};

/**
 * 🎯 ENHANCED: Wait for red highlights to be ready, then enhance them
 */
const waitForRedHighlightsAndEnhance = (
  element: HTMLElement,
  sourceURI: string,
  start: number,
  end: number,
  maxAttempts: number = 10,
  currentAttempt: number = 1
): Promise<boolean> => {
  return new Promise((resolve) => {
    console.log(`🌈 === WAITING FOR RED HIGHLIGHTS (Attempt ${currentAttempt}/${maxAttempts}) ===`);
    console.log('🌈 Element:', element.id);
    console.log('🌈 Looking for .linked-text-highlight elements...');
    
    const linkedTextContainer = element.querySelector('.linked-text-highlights-container');
    const existingHighlights = element.querySelectorAll('.linked-text-highlight');
    const hasLinkedTextClass = element.classList.contains('has-linked-text') || 
                              element.hasAttribute('data-debug-linked');
    
    console.log('🌈 Container found:', !!linkedTextContainer);
    console.log('🌈 Highlights found:', existingHighlights.length);
    console.log('🌈 Has linked text class:', hasLinkedTextClass);
    console.log('🌈 Element classes:', element.className);
    
    // Check if red highlights are ready
    if (existingHighlights.length > 0) {
      console.log('🌈 ✅ Red highlights ready! Proceeding with enhancement...');
      const success = enhanceExistingLinkedTextHighlights(element, sourceURI, start, end);
      resolve(success);
      return;
    }
    
    // If no highlights found but element should have them, wait and retry
    if (hasLinkedTextClass && currentAttempt < maxAttempts) {
      console.log(`🌈 ⏳ Element should have red highlights but none found. Retrying in ${currentAttempt * 200}ms...`);
      setTimeout(() => {
        waitForRedHighlightsAndEnhance(element, sourceURI, start, end, maxAttempts, currentAttempt + 1)
          .then(resolve);
      }, currentAttempt * 200);
      return;
    }
    
    // If no highlights expected or max attempts reached, use fallback
    if (existingHighlights.length === 0) {
      console.log('🌈 ⚠️ No red highlights found after waiting - using fallback highlight');
      element.classList.add('navigation-flash-fallback');
      setTimeout(() => {
        element.classList.remove('navigation-flash-fallback');
      }, 3000);
      resolve(true);
      return;
    }
    
    resolve(false);
  });
};

/**
 * 🎯 NEW: Enhanced navigation highlighting that waits for red link indicators
 */
const enhanceExistingLinkedTextHighlights = (
  element: HTMLElement,
  sourceURI: string,
  start: number,
  end: number
): boolean => {
  console.log('🌈 === ENHANCING EXISTING LINKED TEXT HIGHLIGHTS ===');
  console.log('🌈 Target element:', element.id);
  console.log('🌈 Source URI:', sourceURI);
  console.log('🌈 Range:', start, '-', end);
  
  try {
    // Find existing linked text highlights in this element
    const linkedTextContainer = element.querySelector('.linked-text-highlights-container');
    const existingHighlights = element.querySelectorAll('.linked-text-highlight');
    
    console.log('🌈 Found container:', !!linkedTextContainer);
    console.log('🌈 Found highlights:', existingHighlights.length);
    
    if (existingHighlights.length === 0) {
      console.log('🌈 ⚠️ No existing linked text highlights found');
      
      // Enhanced debugging for missing highlights
      console.log('🌈 🔍 Element debug info:');
      console.log('🌈 - Element ID:', element.id);
      console.log('🌈 - Element classes:', element.className);
      console.log('🌈 - Has linked-text-highlights-container:', !!element.querySelector('.linked-text-highlights-container'));
      console.log('🌈 - Has has-linked-text class:', element.classList.contains('has-linked-text'));
      console.log('🌈 - Has data-debug-linked attr:', element.hasAttribute('data-debug-linked'));
      console.log('🌈 - Data-debug-linked value:', element.getAttribute('data-debug-linked'));
      console.log('🌈 - All child elements with class:', 
        Array.from(element.querySelectorAll('*')).filter(el => el.className).map(el => ({
          tag: el.tagName,
          classes: el.className,
          id: el.id
        }))
      );
      
      // Fallback: Add a temporary highlight to the whole element
      element.classList.add('navigation-flash-fallback');
      setTimeout(() => {
        element.classList.remove('navigation-flash-fallback');
      }, 3000);
      
      return true;
    }
    
    // Enhance existing highlights with navigation flash
    let highlightCount = 0;
    existingHighlights.forEach((highlight, index) => {
      const highlightElement = highlight as HTMLElement;
      
      console.log(`🌈 Enhancing highlight ${index + 1}/${existingHighlights.length}`);
      
      // Add the navigation flash class
      highlightElement.classList.add('navigation-flash');
      
      // Add a staggered animation delay for multiple highlights
      if (index > 0) {
        highlightElement.style.animationDelay = `${index * 100}ms`;
      }
      
      highlightCount++;
    });
    
    // Also flash the paragraph-level indicator if it exists
    if (element.classList.contains('has-linked-text') || element.hasAttribute('data-debug-linked')) {
      console.log('🌈 Adding paragraph-level flash');
      element.classList.add('paragraph-navigation-flash');
    }
    
    // Set up removal of flash classes
    setTimeout(() => {
      existingHighlights.forEach(highlight => {
        const highlightElement = highlight as HTMLElement;
        highlightElement.classList.remove('navigation-flash');
        highlightElement.style.animationDelay = ''; // Clear delay
      });
      
      element.classList.remove('paragraph-navigation-flash');
      console.log('🌈 ✅ Navigation flash completed and cleaned up');
    }, 3000);
    
    console.log(`🌈 ✅ Successfully enhanced ${highlightCount} existing highlights`);
    return true;
    
  } catch (error) {
    console.error('🌈 ❌ Error enhancing existing highlights:', error);
    return false;
  }
};

/**
 * 🎯 ENHANCED: Highlight source text immediately with synchronized timing
 */
export const highlightSourceTextImmediately = async (
  sourceURI: string,
  start: number,
  end: number,
  delay: number = 0 // NEW: Add delay parameter for synchronization
): Promise<boolean> => {
  console.log('🎯 === IMMEDIATE SOURCE HIGHLIGHTING (ENHANCED) ===');
  console.log('🎯 Source URI:', sourceURI);
  console.log('🎯 Range:', start, '-', end);
  console.log('🎯 Delay:', delay, 'ms');
  
  const sourceElement = findElementByMultipleStrategies(sourceURI);
  if (!sourceElement) {
    console.warn('🎯 ❌ Source element not found for immediate highlighting:', sourceURI);
    return false;
  }
  
  console.log('🎯 ✅ Found source element for immediate highlighting:', sourceElement.id);
  
  // Apply delay if specified (for synchronization)
  if (delay > 0) {
    console.log(`🎯 ⏳ Waiting ${delay}ms before highlighting source...`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  
  // Use the waiting approach for more reliable highlighting
  try {
    const success = await waitForRedHighlightsAndEnhance(sourceElement, sourceURI, start, end, 5); // Shorter wait for immediate
    
    if (!success) {
      console.warn('🎯 ⚠️ Immediate source highlighting failed, using fallback');
      highlightWholeElement(sourceElement);
    }
    
    console.log('🎯 ✅ Immediate source highlighting completed');
    return true;
  } catch (error) {
    console.error('🎯 ❌ Error in immediate source highlighting:', error);
    highlightWholeElement(sourceElement);
    return false;
  }
};

/**
 * 🎯 ENHANCED: Scrolls to a specific text element and enhances existing highlights
 * Now includes immediate source highlighting for cross-document navigation
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
}>, highlightSourceImmediately?: boolean): void => {
  console.log('🎯 === scrollToAndHighlightText called ===');
  console.log('🎯 Target info:', targetInfo);
  console.log('🎯 All targets:', allTargets?.length || 0);
  console.log('🎯 Highlight source immediately:', highlightSourceImmediately);
  
  // 🎯 NEW: If requested, highlight source text immediately before any document changes
  if (highlightSourceImmediately && allTargets && allTargets.length > 1) {
    console.log('🎯 === HIGHLIGHTING SOURCE TEXT IMMEDIATELY ===');
    
    // Find the source target (usually the first one or the one that matches targetInfo)
    const sourceTarget = allTargets.find(target => 
      target.sourceURI === targetInfo.sourceURI ||
      target.start === targetInfo.start && target.end === targetInfo.end
    ) || allTargets[0];
    
    if (sourceTarget) {
      console.log('🎯 Source target identified:', sourceTarget.sourceURI);
      highlightSourceTextImmediately(sourceTarget.sourceURI, sourceTarget.start, sourceTarget.end);
    }
  }
  
  // Wait for DOM to be fully ready
  const executeWithRetry = (attempt: number = 1, maxAttempts: number = 5): void => {
    console.log(`🎯 Attempt ${attempt}/${maxAttempts} to find target elements`);
    
    // If we have multiple targets, enhance all of them
    const targetsToHighlight = allTargets && allTargets.length > 0 ? allTargets : [
      {
        sourceURI: targetInfo.sourceURI,
        start: targetInfo.start,
        end: targetInfo.end,
        text: ''
      }
    ];
    
    console.log('🎯 === DETAILED TARGET ANALYSIS ===');
    console.log('🎯 Total targets to highlight:', targetsToHighlight.length);
    targetsToHighlight.forEach((target, index) => {
      console.log(`🎯 Target ${index + 1}:`, {
        sourceURI: target.sourceURI,
        range: `${target.start}-${target.end}`,
        text: target.text?.substring(0, 30) + '...'
      });
    });
    
    // Find valid targets with enhanced debugging
    const validTargets = targetsToHighlight.filter((target, index) => {
      console.log(`🎯 === VALIDATING TARGET ${index + 1}/${targetsToHighlight.length} ===`);
      console.log(`🎯 Searching for element: ${target.sourceURI}`);
      
      const element = findElementByMultipleStrategies(target.sourceURI);
      
      if (!element) {
        console.warn(`🎯 ❌ Target element not found (attempt ${attempt}): ${target.sourceURI}`);
        
        // Additional debugging: List all available DocumentElements
        const allDocElements = document.querySelectorAll('[id*="DocumentElements"]');
        console.log(`🎯 Available DocumentElements in DOM:`, 
          Array.from(allDocElements).map(el => el.id).slice(0, 10)
        );
        
        return false;
      }
      
      console.log(`🎯 ✅ Found element: ${element.id} (tag: ${element.tagName})`);
      
      // Check if element has linked text highlights
      const existingHighlights = element.querySelectorAll('.linked-text-highlight');
      console.log(`🎯 Existing red highlights in element: ${existingHighlights.length}`);
      
      // Validate the text range
      const textLength = element.textContent?.length || 0;
      
      if (target.start < 0 || target.end > textLength || target.start >= target.end) {
        console.warn(`🎯 ❌ Invalid range for ${target.sourceURI}: [${target.start}-${target.end}] in text of length ${textLength}`);
        return false;
      }
      
      console.log(`🎯 ✅ Valid target: ${target.sourceURI} [${target.start}-${target.end}] in text of length ${textLength}`);
      console.log(`🎯 ✅ Red highlights available: ${existingHighlights.length > 0 ? 'YES' : 'NO'}`);
      
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
    
    // Find the first element to scroll to (prioritize target over source for cross-document navigation)
    let primaryTarget = validTargets[0];

    // 🎯 FIXED: Always prioritize target elements for scrolling in cross-document scenarios
    if (validTargets.length > 1) {
      // Find target elements (not the one matching targetInfo, which is usually the target to scroll to)
      const targetElements = validTargets.filter(target => 
        target.sourceURI === targetInfo.sourceURI &&
        target.start === targetInfo.start && 
        target.end === targetInfo.end
      );
      
      if (targetElements.length > 0) {
        primaryTarget = targetElements[0];
        console.log('🎯 Using target element for scrolling:', primaryTarget.sourceURI);
      } else {
        // If no exact match, use the element that's different from the first one
        if (validTargets.length > 1 && validTargets[1]) {
          primaryTarget = validTargets[1];
          console.log('🎯 Using second target for scrolling:', primaryTarget.sourceURI);
        }
      }
    }
    
    const primaryElement = findElementByMultipleStrategies(primaryTarget.sourceURI);

    console.log('🎯 🔍 PRIMARY ELEMENT DEBUG:', {
      primaryTarget: primaryTarget.sourceURI,
      elementFound: !!primaryElement,
      elementId: primaryElement?.id,
      documentPanel: primaryElement?.closest('[data-document-id]')?.getAttribute('data-document-id')
    });
    
    if (!primaryElement) {
      console.error(`🎯 ❌ Primary target element lost: ${primaryTarget.sourceURI}`);
      return;
    }
    
    console.log('🎯 📜 Scrolling to primary element:', primaryElement);
    
    // Scroll to element
    scrollToElementSafely(primaryElement);
    
    // Enhance all valid targets with staggered timing
    setTimeout(() => {
      console.log('🎯 === STARTING MULTI-DOCUMENT HIGHLIGHTING SEQUENCE ===');
      console.log(`🎯 Total valid targets to highlight: ${validTargets.length}`);
      
      // Group targets by document for better organization
      const targetsByDocument = new Map<string, typeof validTargets>();
      validTargets.forEach(target => {
        const element = findElementByMultipleStrategies(target.sourceURI);
        if (element) {
          const documentPanel = element.closest('[data-document-id]');
          const documentId = documentPanel?.getAttribute('data-document-id') || 'unknown';
          
          if (!targetsByDocument.has(documentId)) {
            targetsByDocument.set(documentId, []);
          }
          targetsByDocument.get(documentId)!.push(target);
        }
      });
      
      console.log('🎯 Targets grouped by document:', 
        Array.from(targetsByDocument.entries()).map(([docId, targets]) => ({
          documentId: docId,
          targetCount: targets.length,
          sourceURIs: targets.map(t => t.sourceURI)
        }))
      );
      
      // Execute highlighting for each document
      let globalIndex = 0;
      Array.from(targetsByDocument.entries()).forEach(([documentId, docTargets], docIndex) => {
        console.log(`🎯 === PROCESSING DOCUMENT ${documentId} (${docIndex + 1}/${targetsByDocument.size}) ===`);
        console.log(`🎯 Targets in this document: ${docTargets.length}`);
        
        docTargets.forEach((target, targetIndex) => {
          const targetElement = findElementByMultipleStrategies(target.sourceURI);
          
          if (targetElement) {
            console.log(`🎯 Processing target ${targetIndex + 1}/${docTargets.length} in document ${documentId}:`, {
              sourceURI: target.sourceURI,
              start: target.start,
              end: target.end,
              textLength: targetElement.textContent?.length || 0,
              elementId: targetElement.id
            });
            
            // 🎯 NEW: Skip highlighting if we already highlighted this source immediately
            const isSourceTarget = highlightSourceImmediately && (
              target.sourceURI === targetInfo.sourceURI ||
              (target.start === targetInfo.start && target.end === targetInfo.end)
            );
            
            if (isSourceTarget) {
              console.log(`🎯 ⏭️ Skipping ${target.sourceURI} - already highlighted immediately`);
              globalIndex++;
              return;
            }
            
            // Use global index for timing to ensure proper sequencing across documents
            const delay = globalIndex * 150;
            console.log(`🎯 Scheduling highlight with ${delay}ms delay (global index: ${globalIndex})`);
            
            setTimeout(async () => {
              console.log(`🎯 === EXECUTING HIGHLIGHT ${globalIndex + 1}/${validTargets.length} ===`);
              console.log(`🎯 Document: ${documentId}, Element: ${target.sourceURI}`);
              
              // 🎯 NEW: Use the waiting approach for better reliability
              try {
                const success = await waitForRedHighlightsAndEnhance(
                  targetElement, 
                  target.sourceURI, 
                  target.start, 
                  target.end
                );
                
                if (!success) {
                  console.warn(`🎯 ⚠️ Navigation highlighting failed for ${target.sourceURI}, using fallback`);
                  highlightWholeElement(targetElement);
                } else {
                  console.log(`🎯 ✅ Successfully highlighted ${target.sourceURI} in document ${documentId}`);
                }
              } catch (error) {
                console.error(`🎯 ❌ Error in navigation highlighting for ${target.sourceURI}:`, error);
                highlightWholeElement(targetElement);
              }
            }, delay);
            
            globalIndex++;
          } else {
            console.error(`🎯 ❌ Target element lost during highlighting: ${target.sourceURI}`);
          }
        });
      });
      
      console.log(`🎯 === HIGHLIGHTING SEQUENCE SCHEDULED ===`);
      console.log(`🎯 Total highlights scheduled: ${globalIndex}`);
      console.log(`🎯 Documents involved: ${targetsByDocument.size}`);
      console.log(`🎯 Sequence will complete in: ${globalIndex * 150}ms`);
    }, 800);
  };
  
  // Start the execution with retry logic
  executeWithRetry();
};

/**
 * Multi-element highlighting function - ENHANCED
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
        enhanceExistingLinkedTextHighlights(targetElement, target.sourceURI, target.start, target.end);
      }, index * 100);
    } else {
      console.warn(`🌟 Multi-element target not found:`, target.sourceURI);
    }
  });
};

/**
 * Highlights the entire element as a fallback with better styling
 */
const highlightWholeElement = (element: HTMLElement): void => {
  console.log('🌟 Applying whole element highlight');
  
  const originalBackgroundColor = window.getComputedStyle(element).backgroundColor;
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

// Keep the old function for backward compatibility but mark as deprecated
export const createPreciseTextHighlight = (
  element: HTMLElement, 
  start: number, 
  end: number
): boolean => {
  console.warn('🔄 createPreciseTextHighlight is deprecated - using enhanced navigation highlighting instead');
  return enhanceExistingLinkedTextHighlights(element, element.id, start, end);
};