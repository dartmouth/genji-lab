// src/features/documentView/utils/scrollToTextUtils.ts
/**
 * Type guard to check if an element is a valid HTMLElement
 */
const isValidHTMLElement = (
  element: Element | null
): element is HTMLElement => {
  return (
    element !== null &&
    element instanceof HTMLElement &&
    typeof element.getBoundingClientRect === "function" &&
    typeof element.scrollIntoView === "function"
  );
};

/**
 * Checks if a document element is currently visible in the viewport
 */
export const isElementInViewport = (element: Element | null): boolean => {
  if (!isValidHTMLElement(element)) {
    return false;
  }

  try {
    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <=
        (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  } catch {
    return false;
  }
};

/**
 * Safe scrolling with viewport checking
 */
const scrollToElementSafely = (element: HTMLElement): boolean => {
  try {
    // Check if element is already in viewport
    if (isElementInViewport(element)) {
      return true;
    }

    // Use scrollIntoView
    if (typeof element.scrollIntoView === "function") {
      element.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "nearest",
      });
      return true;
    } else {
      // Fallback for older browsers
      try {
        const rect = element.getBoundingClientRect();
        const scrollTop =
          window.pageYOffset + rect.top - window.innerHeight / 2;
        window.scrollTo({
          top: scrollTop,
          behavior: "smooth",
        });
        return true;
      } catch (error) {
        console.error("getBoundingClientRect failed:", error);
        return false;
      }
    }
  } catch (error) {
    console.error("Scroll error:", error);
    return false;
  }
};

/**
 * Multiple strategies to find elements by sourceURI with enhanced debugging
 */
const findElementByMultipleStrategies = (
  sourceURI: string
): HTMLElement | null => {
  if (!sourceURI || typeof sourceURI !== "string") {
    console.error("Invalid sourceURI provided:", sourceURI);
    return null;
  }

  try {
    // Strategy 1: Direct ID lookup
    const normalizedId = sourceURI.startsWith("/")
      ? sourceURI.substring(1)
      : sourceURI;

    let element: Element | null = document.getElementById(normalizedId);
    if (isValidHTMLElement(element)) {
      // Verify it's in a visible document panel
      const documentPanel = element.closest("[data-document-id]");
      if (documentPanel) {
        return element;
      }
    }

    // Strategy 2: querySelector with exact ID
    element = document.querySelector(`#${CSS.escape(normalizedId)}`);
    if (isValidHTMLElement(element)) {
      const documentPanel = element.closest("[data-document-id]");
      if (documentPanel) {
        return element;
      }
    }

    // Strategy 3: Look for data attributes
    const elementId = sourceURI.split("/").pop();
    if (elementId) {
      element = document.querySelector(`[data-element-id="${elementId}"]`);
      if (isValidHTMLElement(element)) {
        return element;
      }

      element = document.querySelector(`[data-source-uri="${sourceURI}"]`);
      if (isValidHTMLElement(element)) {
        return element;
      }
    }

    // Strategy 4: Search within specific document panels
    const documentPanels = document.querySelectorAll("[data-document-id]");

    for (const panel of documentPanels) {
      // Try to find the element within this panel
      const elementInPanel = panel.querySelector(
        `#${CSS.escape(normalizedId)}`
      );
      if (elementInPanel && isValidHTMLElement(elementInPanel)) {
        return elementInPanel;
      }

      // Try with element ID if we have it
      if (elementId) {
        const elementById = panel.querySelector(`[id*="${elementId}"]`);
        if (
          elementById &&
          isValidHTMLElement(elementById) &&
          elementById.id.includes("DocumentElements")
        ) {
          return elementById;
        }
      }
    }

    // Strategy 5: Partial match (last resort)
    const elements = Array.from(
      document.querySelectorAll('[id*="DocumentElements"]')
    );

    for (const el of elements) {
      if (isValidHTMLElement(el) && el.id.includes(elementId || "")) {
        // Verify it's in a document panel
        const documentPanel = el.closest("[data-document-id]");
        if (documentPanel) {
          return el;
        }
      }
    }

    return null;
  } catch (error) {
    console.error("Error finding element:", error);
    return null;
  }
};

/**
 * Enhanced highlighting interface for better type safety
 */
interface HighlightResult {
  success: boolean;
  error?: Error;
  highlightCount?: number;
}

/**
 * Text range interface for better type safety
 */
interface TextRange {
  start: number;
  end: number;
}

/**
 * Target interface for highlighting operations
 */
interface HighlightTarget {
  sourceURI: string;
  start: number;
  end: number;
  text: string;
}

/**
 * Wait for red highlights to be ready, then enhance them
 */
const waitForRedHighlightsAndEnhance = (
  element: HTMLElement,
  sourceURI: string,
  start: number,
  end: number,
  maxAttempts: number = 10,
  currentAttempt: number = 1
): Promise<HighlightResult> => {
  return new Promise((resolve) => {
    const existingHighlights = element.querySelectorAll(
      ".linked-text-highlight"
    );
    const hasLinkedTextClass =
      element.classList.contains("has-linked-text") ||
      element.hasAttribute("data-debug-linked");

    if (existingHighlights.length > 0) {
      // 🎯 CHANGE: Pass start/end parameters
      const result = enhanceExistingLinkedTextHighlights(element, start, end);
      resolve(result);
      return;
    }

    if (hasLinkedTextClass && currentAttempt < maxAttempts) {
      setTimeout(() => {
        waitForRedHighlightsAndEnhance(
          element,
          sourceURI,
          start,
          end,
          maxAttempts,
          currentAttempt + 1
        ).then(resolve);
      }, currentAttempt * 200);
      return;
    }

    if (existingHighlights.length === 0) {
      element.classList.add("navigation-flash-fallback");
      setTimeout(() => {
        element.classList.remove("navigation-flash-fallback");
      }, 3000);
      resolve({ success: true, highlightCount: 0 });
      return;
    }

    resolve({ success: false });
  });
};

/**
 * Navigation highlighting that waits for red link indicators
 */
const enhanceExistingLinkedTextHighlights = (
  element: HTMLElement,
  targetStart?: number,
  targetEnd?: number
): HighlightResult => {
  try {
    const existingHighlights = element.querySelectorAll(
      ".linked-text-highlight"
    );

    if (existingHighlights.length === 0) {
      // Fallback: Add a temporary highlight to the whole element
      element.classList.add("navigation-flash-fallback");
      setTimeout(() => {
        element.classList.remove("navigation-flash-fallback");
      }, 3000);
      return { success: true, highlightCount: 0 };
    }

    let highlightCount = 0;
    const matchedHighlights: HTMLElement[] = [];

    // First pass: find matching highlights
    existingHighlights.forEach((highlight) => {
      if (highlight instanceof HTMLElement) {
        // 🎯 Filter by exact position if provided
        if (targetStart !== undefined && targetEnd !== undefined) {
          const highlightStart = parseInt(
            highlight.getAttribute("data-start") || "-1"
          );
          const highlightEnd = parseInt(
            highlight.getAttribute("data-end") || "-1"
          );

          // Skip if this highlight doesn't match the target range
          if (highlightStart !== targetStart || highlightEnd !== targetEnd) {
            return;
          }
        }

        matchedHighlights.push(highlight);
        highlightCount++;
      }
    });

    // Second pass: apply animation to matched highlights only
    if (matchedHighlights.length > 0) {
      // Generate a unique animation ID to force restart
      const animationId = `nav-flash-${Date.now()}`;

      matchedHighlights.forEach((highlight) => {
        // Add the navigation flash class
        highlight.classList.add("navigation-flash");
        highlight.setAttribute("data-animation-id", animationId);
      });

      // Remove flash class after animation completes
      setTimeout(() => {
        matchedHighlights.forEach((highlight) => {
          highlight.classList.remove("navigation-flash");
          highlight.removeAttribute("data-animation-id");
        });
      }, 3000);
    }

    // Also flash the paragraph-level indicator if it exists
    if (
      element.classList.contains("has-linked-text") ||
      element.hasAttribute("data-debug-linked")
    ) {
      element.classList.add("paragraph-navigation-flash");

      setTimeout(() => {
        element.classList.remove("paragraph-navigation-flash");
      }, 3000);
    }

    return { success: true, highlightCount };
  } catch (error) {
    console.error("Error enhancing existing highlights:", error);
    return {
      success: false,
      error: error instanceof Error ? error : new Error("Unknown error"),
      highlightCount: 0,
    };
  }
};

/**
 * Validates text range against element content
 */
const isValidTextRange = (element: HTMLElement, range: TextRange): boolean => {
  const textLength = element.textContent?.length || 0;
  return range.start >= 0 && range.end <= textLength && range.start < range.end;
};

/**
 * Highlight source text immediately with synchronized timing
 */
export const highlightSourceTextImmediately = async (
  sourceURI: string,
  start: number,
  end: number,
  delay: number = 0
): Promise<HighlightResult> => {
  const sourceElement = findElementByMultipleStrategies(sourceURI);
  if (!sourceElement) {
    return {
      success: false,
      error: new Error(`Element not found: ${sourceURI}`),
    };
  }

  if (!isValidTextRange(sourceElement, { start, end })) {
    return {
      success: false,
      error: new Error(`Invalid text range: ${start}-${end}`),
    };
  }

  // Apply delay if specified (for synchronization)
  if (delay > 0) {
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  // Use the waiting approach for more reliable highlighting
  try {
    const result = await waitForRedHighlightsAndEnhance(
      sourceElement,
      sourceURI,
      start,
      end,
      5
    );

    if (!result.success) {
      const fallbackResult = highlightWholeElement(sourceElement);
      return fallbackResult;
    }
    return result;
  } catch (error) {
    console.error(error);
    const fallbackResult = highlightWholeElement(sourceElement);
    return fallbackResult;
  }
};

export const scrollToAndHighlightText = (
  targetInfo: {
    sourceURI: string;
    start: number;
    end: number;
  },
  allTargets?: HighlightTarget[],
  highlightSourceImmediately?: boolean
): Promise<HighlightResult[]> => {
  return new Promise((resolve) => {
    // If requested, highlight source text immediately before any document changes
    if (highlightSourceImmediately && allTargets && allTargets.length > 1) {
      // Find the source target (usually the first one or the one that matches targetInfo)
      const sourceTarget =
        allTargets.find(
          (target) =>
            target.sourceURI === targetInfo.sourceURI ||
            (target.start === targetInfo.start && target.end === targetInfo.end)
        ) || allTargets[0];

      if (sourceTarget) {
        highlightSourceTextImmediately(
          sourceTarget.sourceURI,
          sourceTarget.start,
          sourceTarget.end
        );
      }
    }

    // Wait for DOM to be fully ready
    const executeWithRetry = (
      attempt: number = 1,
      maxAttempts: number = 5
    ): void => {
      // If we have multiple targets, enhance all of them
      const targetsToHighlight: HighlightTarget[] =
        allTargets && allTargets.length > 0
          ? allTargets
          : [
              {
                sourceURI: targetInfo.sourceURI,
                start: targetInfo.start,
                end: targetInfo.end,
                text: "",
              },
            ];

      // Find valid targets with enhanced debugging
      const validTargets = targetsToHighlight.filter((target) => {
        const element = findElementByMultipleStrategies(target.sourceURI);
        return element && isValidTextRange(element, target);
      });

      if (validTargets.length === 0) {
        if (attempt < maxAttempts) {
          setTimeout(
            () => executeWithRetry(attempt + 1, maxAttempts),
            attempt * 500
          );
          return;
        } else {
          resolve([
            { success: false, error: new Error("No valid targets found") },
          ]);
          return;
        }
      }

      // Find the first element to scroll to
      let primaryTarget = validTargets[0];

      // Always prioritize target elements for scrolling in cross-document scenarios
      if (validTargets.length > 1) {
        const targetElements = validTargets.filter(
          (target) =>
            target.sourceURI === targetInfo.sourceURI &&
            target.start === targetInfo.start &&
            target.end === targetInfo.end
        );

        if (targetElements.length > 0) {
          primaryTarget = targetElements[0];
        } else if (validTargets[1]) {
          primaryTarget = validTargets[1];
        }
      }

      const primaryElement = findElementByMultipleStrategies(
        primaryTarget.sourceURI
      );

      if (!primaryElement) {
        resolve([
          { success: false, error: new Error("Primary element not found") },
        ]);
        return;
      }

      // Scroll to element
      const scrollSuccess = scrollToElementSafely(primaryElement);
      if (!scrollSuccess) {
        console.error("Failed to scroll to element");
      }

      // Enhance all valid targets with staggered timing
      setTimeout(() => {
        // Group targets by document for better organization
        const targetsByDocument = new Map<string, HighlightTarget[]>();
        validTargets.forEach((target) => {
          const element = findElementByMultipleStrategies(target.sourceURI);
          if (element) {
            const documentPanel = element.closest("[data-document-id]");
            const documentId =
              documentPanel?.getAttribute("data-document-id") || "unknown";

            if (!targetsByDocument.has(documentId)) {
              targetsByDocument.set(documentId, []);
            }
            targetsByDocument.get(documentId)!.push(target);
          }
        });

        // Execute highlighting for each document
        let globalIndex = 0;
        const promises: Promise<HighlightResult>[] = [];

        Array.from(targetsByDocument.entries()).forEach(([, docTargets]) => {
          docTargets.forEach((target) => {
            const targetElement = findElementByMultipleStrategies(
              target.sourceURI
            );

            if (targetElement) {
              const isSourceTarget =
                highlightSourceImmediately &&
                (target.sourceURI === targetInfo.sourceURI ||
                  (target.start === targetInfo.start &&
                    target.end === targetInfo.end));

              if (isSourceTarget) {
                globalIndex++;
                return;
              }

              // Use global index for timing to ensure proper sequencing across documents
              const delay = globalIndex * 150;

              const promise = new Promise<HighlightResult>(
                (resolveHighlight) => {
                  setTimeout(async () => {
                    try {
                      const result = await waitForRedHighlightsAndEnhance(
                        targetElement,
                        target.sourceURI,
                        target.start,
                        target.end
                      );

                      if (!result.success) {
                        const fallbackResult =
                          highlightWholeElement(targetElement);
                        resolveHighlight(fallbackResult);
                      } else {
                        resolveHighlight(result);
                      }
                    } catch (error) {
                      console.error(
                        `Error in navigation highlighting for ${target.sourceURI}:`,
                        error
                      );
                      const fallbackResult =
                        highlightWholeElement(targetElement);
                      resolveHighlight(fallbackResult);
                    }
                  }, delay);
                }
              );

              promises.push(promise);
              globalIndex++;
            }
          });
        });

        Promise.all(promises).then(resolve);
      }, 800);
    };

    // Start the execution with retry logic
    executeWithRetry();
  });
};

/**
 * Multi-element highlighting function - ENHANCED
 */
export const highlightMultiElementText = async (
  targets: HighlightTarget[]
): Promise<HighlightResult[]> => {
  const promises = targets.map((target, index) => {
    return new Promise<HighlightResult>((resolve) => {
      const targetElement = findElementByMultipleStrategies(target.sourceURI);

      if (!targetElement) {
        resolve({
          success: false,
          error: new Error(`Element not found: ${target.sourceURI}`),
        });
        return;
      }

      setTimeout(() => {
        const result = enhanceExistingLinkedTextHighlights(targetElement);
        resolve(result);
      }, index * 100);
    });
  });

  return Promise.all(promises);
};

/**
 * Highlights the entire element as a fallback with better styling
 */
const highlightWholeElement = (element: HTMLElement): HighlightResult => {
  try {
    const originalBackgroundColor =
      window.getComputedStyle(element).backgroundColor;
    const originalTransition = element.style.transition;
    const originalBoxShadow = element.style.boxShadow;

    // Apply highlight with more visible styling
    element.style.transition = "all 0.3s ease";
    element.style.backgroundColor = "#ffeb3b";
    element.style.boxShadow = "0 0 10px rgba(255, 235, 59, 0.5)";
    element.style.borderRadius = "4px";

    // Pulse effect
    setTimeout(() => {
      element.style.backgroundColor = "#fff176";
    }, 300);

    setTimeout(() => {
      element.style.backgroundColor = "#ffeb3b";
    }, 600);

    // Remove highlight after a delay
    setTimeout(() => {
      element.style.backgroundColor = originalBackgroundColor;
      element.style.boxShadow = originalBoxShadow;
      setTimeout(() => {
        element.style.transition = originalTransition;
      }, 300);
    }, 2500);

    return { success: true, highlightCount: 1 };
  } catch (error) {
    console.error("Error in highlightWholeElement:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error
          : new Error("Unknown highlighting error"),
      highlightCount: 0,
    };
  }
};

/**
 * Validates if text range is valid for the given element
 */
export const validateTextRange = (
  element: HTMLElement,
  start: number,
  end: number
): boolean => {
  return isValidTextRange(element, { start, end });
};

// Keep the old function for backward compatibility but mark as deprecated
export const createPreciseTextHighlight = (
  element: HTMLElement
): HighlightResult => {
  return enhanceExistingLinkedTextHighlights(element);
};
