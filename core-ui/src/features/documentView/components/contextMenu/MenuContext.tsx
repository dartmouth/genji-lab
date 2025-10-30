// src/features/documentView/components/contextMenu/MenuContext.tsx

import React, { useState, useEffect, useCallback, useRef } from "react";
import { ContextMenu, ContextButton } from "./ContextMenuComponents";
import HierarchicalLinkedTextMenu from "./HierarchicalLinkedTextMenu";
import { createPortal } from "react-dom";
import { useAuth } from "@hooks/useAuthContext";

import {
  useAppDispatch,
  useAppSelector,
  selectSegments,
  setMotivation,
  selectAnnotationCreate,
  fetchAllDocumentElements,
  RootState,
} from "@store";
import {
  createSelectionFromDOMSelection,
  LinkedTextSelection,
  getLinkedAnnotationsByAnnotation,
  HierarchicalLinkedAnnotations,
} from "@documentView/utils/linkedTextUtils";
import {
  selectAllLinkingAnnotations,
  selectAllLoadedElements,
} from "@store/selector/combinedSelectors";

interface MenuContextProps {
  viewedDocuments?: Array<{
    id: number;
    collectionId: number;
    title: string;
  }>;
}

interface ContextMenuState {
  isVisible: boolean;
  position: { x: number; y: number };
  selection: LinkedTextSelection | null;
  hierarchicalAnnotations: HierarchicalLinkedAnnotations;
  showHierarchicalMenu: boolean;
}

const MenuContext: React.FC<MenuContextProps> = ({ viewedDocuments = [] }) => {
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const text = useAppSelector(selectSegments);
  const annotationCreate = useAppSelector(selectAnnotationCreate);

  // Use ref to track if bulk loading has been initiated
  const bulkLoadingInitiated = useRef(false);

  // Use memoized selector instead of inline selector
  const allLinkingAnnotations = useAppSelector(selectAllLinkingAnnotations);

  // Get bulk loading status
  const bulkLoadingStatus = useAppSelector(
    (state: RootState) => state.documentElements.bulkLoadingStatus || "idle"
  );

  // Centralized menu state
  const [menuState, setMenuState] = useState<ContextMenuState>({
    isVisible: false,
    position: { x: 0, y: 0 },
    selection: null,
    hierarchicalAnnotations: {},
    showHierarchicalMenu: false,
  });

  // Use memoized selector instead of inline selector
  const allElements = useAppSelector(selectAllLoadedElements);

  // One API call to load all documents and elements
  useEffect(() => {
    const loadAllDocumentsAndElements = async () => {
      // Use ref to prevent multiple calls
      if (bulkLoadingInitiated.current) {
        return;
      }

      // Skip if already loaded or loading
      if (
        bulkLoadingStatus === "succeeded" ||
        bulkLoadingStatus === "loading"
      ) {
        return;
      }

      bulkLoadingInitiated.current = true;

      try {
        await dispatch(fetchAllDocumentElements()).unwrap();
      } catch (error) {
        console.error("Failed to bulk load documents and elements:", error);
        // Reset the flag on error so it can be retried
        bulkLoadingInitiated.current = false;
      }
    };

    loadAllDocumentsAndElements();
  }, [dispatch, bulkLoadingStatus]);

  // Smart selection creation with better element detection
  const createSelectionFromClickContext = useCallback(
    (clickedElement: HTMLElement): LinkedTextSelection | null => {
      // Try existing text selection first
      const selection = window.getSelection();
      if (
        selection &&
        selection.rangeCount > 0 &&
        selection.toString().trim().length > 0
      ) {
        const selectionData = createSelectionFromDOMSelection(
          selection,
          viewedDocuments
        );
        if (selectionData) {
          return selectionData;
        }
      }

      // Find document context
      const documentPanel = clickedElement.closest(
        "[data-document-id]"
      ) as HTMLElement;
      if (!documentPanel) {
        return null;
      }

      const documentId = parseInt(
        documentPanel.getAttribute("data-document-id") || "0"
      );
      const foundDocument = viewedDocuments.find((d) => d.id === documentId);

      if (!foundDocument) {
        return null;
      }

      // Find element container with multiple strategies
      let elementContainer: HTMLElement | null = clickedElement;
      let elementId: number | null = null;

      // Look for direct element ID
      while (elementContainer && !elementId) {
        if (elementContainer.id?.includes("DocumentElements")) {
          const match = elementContainer.id.match(/DocumentElements\/(\d+)/);
          if (match) {
            elementId = parseInt(match[1]);
            break;
          }
        }
        elementContainer = elementContainer.parentElement;
      }

      // Look for data attributes
      if (!elementId) {
        elementContainer = clickedElement;
        while (elementContainer) {
          const dataElementId =
            elementContainer.getAttribute("data-element-id");
          if (dataElementId) {
            elementId = parseInt(dataElementId);
            break;
          }
          elementContainer = elementContainer.parentElement;
        }
      }

      // Look for any numeric ID that might be an element
      if (!elementId) {
        elementContainer = clickedElement;
        while (elementContainer) {
          if (elementContainer.id && /^\d+$/.test(elementContainer.id)) {
            const potentialId = parseInt(elementContainer.id);
            // Verify this element exists in our elements
            if (
              allElements.some(
                (el) => el.id === potentialId && el.document_id === documentId
              )
            ) {
              elementId = potentialId;
              break;
            }
          }
          elementContainer = elementContainer.parentElement;
        }
      }

      if (!elementId) {
        return null;
      }

      // Verify element exists
      const element = allElements.find(
        (el) => el.id === elementId && el.document_id === documentId
      );
      if (!element) {
        return null;
      }

      // NEW: Check if user clicked on a linked text highlight span
      // Look for the closest span with data-start and data-end attributes
      let targetSpan = clickedElement.closest(
        "[data-start][data-end]"
      ) as HTMLElement;

      // If not found on clicked element, check if clicked element IS the span
      if (
        !targetSpan &&
        clickedElement.hasAttribute("data-start") &&
        clickedElement.hasAttribute("data-end")
      ) {
        targetSpan = clickedElement;
      }

      if (targetSpan) {
        // Extract position from the linked text span
        const linkStart = parseInt(
          targetSpan.getAttribute("data-start") || "0"
        );
        const linkEnd = parseInt(targetSpan.getAttribute("data-end") || "0");
        const linkText = targetSpan.textContent || "";

        console.log("🎯 User clicked on linked text span:", {
          linkStart,
          linkEnd,
          linkText: linkText.substring(0, 50) + "...",
        });

        const preciseSelection: LinkedTextSelection = {
          documentId: foundDocument.id,
          documentElementId: elementId,
          text: linkText,
          start: linkStart,
          end: linkEnd,
          sourceURI: `DocumentElements/${elementId}`,
          isSyntheticSelection: false, // This is a precise selection based on the span
        };

        return preciseSelection;
      }

      // Fallback: Create synthetic selection for the whole element
      const syntheticSelection: LinkedTextSelection = {
        documentId: foundDocument.id,
        documentElementId: elementId,
        text: clickedElement.textContent?.substring(0, 100) || "clicked text",
        start: 0,
        end: Math.min(50, clickedElement.textContent?.length || 50),
        sourceURI: `DocumentElements/${elementId}`, // No leading slash
        isSyntheticSelection: true, // Mark as synthetic so we don't do position overlap checking
      };

      return syntheticSelection;
    },
    [viewedDocuments, allElements]
  );

  // NEW: Find linked annotations (grouped by annotation, not document)
  const findLinkedAnnotations = useCallback(
    (selection: LinkedTextSelection): HierarchicalLinkedAnnotations => {
      try {
        return getLinkedAnnotationsByAnnotation(
          selection,
          allLinkingAnnotations
        );
      } catch (error) {
        console.error("Error finding linked annotations:", error);
        return {};
      }
    },
    [allLinkingAnnotations]
  );

  // Context menu event handler
  useEffect(() => {
    if (bulkLoadingStatus !== "succeeded") {
      return;
    }

    const handleContextMenu = async (e: MouseEvent) => {
      const clickedElement = e.target as HTMLElement;
      let selection = createSelectionFromClickContext(clickedElement);

      if (!selection) {
        return;
      }

      console.log("📍 Context menu triggered");
      console.log("Initial selection:", selection);

      // NEW: Check if user clicked on a linked text highlight overlay
      // The overlays are absolutely positioned divs with data-start/data-end attributes
      const elementsAtPoint = document.elementsFromPoint(e.clientX, e.clientY);
      console.log("Elements at click point:", elementsAtPoint.length);
      console.log(
        "First 5 elements:",
        elementsAtPoint.slice(0, 5).map((el) => ({
          tag: el.tagName,
          classes: el.className,
          hasDataStart: el.hasAttribute("data-start"),
          hasDataEnd: el.hasAttribute("data-end"),
        }))
      );

      const linkOverlay = elementsAtPoint.find(
        (el) =>
          el.classList.contains("linked-text-highlight") &&
          el.hasAttribute("data-start") &&
          el.hasAttribute("data-end")
      ) as HTMLElement;

      console.log("Found link overlay:", linkOverlay);

      if (linkOverlay) {
        const linkStart = parseInt(
          linkOverlay.getAttribute("data-start") || "0"
        );
        const linkEnd = parseInt(linkOverlay.getAttribute("data-end") || "0");

        console.log("🎯 User clicked on linked text overlay:", {
          linkStart,
          linkEnd,
          annotationId: linkOverlay.getAttribute("data-annotation-id"),
        });

        // Override the selection with precise positions from the overlay
        selection = {
          ...selection,
          start: linkStart,
          end: linkEnd,
          isSyntheticSelection: false, // This is precise, not synthetic
        };
      } else {
        console.log("❌ No link overlay found at click point");
      }

      e.preventDefault();
      e.stopPropagation();

      const position = {
        x: Math.min(e.clientX, window.innerWidth - 250),
        y: Math.min(e.clientY, window.innerHeight - 200),
      };

      // Find linked annotations (now grouped by annotation, not document)
      const hierarchicalAnnotations = findLinkedAnnotations(selection);

      // Update menu state
      setMenuState({
        isVisible: true,
        position,
        selection,
        hierarchicalAnnotations,
        showHierarchicalMenu: false,
      });
    };

    const handleClick = (e: MouseEvent) => {
      const target = e.target as Element;

      const isOutsideMenus =
        !target.closest(".context-menu") &&
        !target.closest(".hierarchical-linked-text-menu");

      if (isOutsideMenus) {
        setMenuState((prev) => ({
          ...prev,
          isVisible: false,
          showHierarchicalMenu: false,
        }));
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuState((prev) => ({
          ...prev,
          isVisible: false,
          showHierarchicalMenu: false,
        }));
      }
    };

    document.addEventListener("contextmenu", handleContextMenu, {
      capture: true,
      passive: false,
    });
    document.addEventListener("click", handleClick, { capture: true });
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu, {
        capture: true,
      });
      document.removeEventListener("click", handleClick, { capture: true });
      document.removeEventListener("keydown", handleEscape);
    };
  }, [
    viewedDocuments,
    createSelectionFromClickContext,
    findLinkedAnnotations,
    bulkLoadingStatus,
  ]);

  // Close menus when annotation creation starts
  useEffect(() => {
    if (annotationCreate?.motivation && menuState.isVisible) {
      setMenuState((prev) => ({
        ...prev,
        isVisible: false,
        showHierarchicalMenu: false,
      }));
    }
  }, [annotationCreate?.motivation, menuState.isVisible]);

  const handleViewLinkedText = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Always show hierarchical menu, regardless of annotation count
    setMenuState((prev) => ({
      ...prev,
      showHierarchicalMenu: true,
    }));
  }, []);

  const calculateHierarchicalMenuPosition = useCallback(() => {
    const mainMenuWidth = 200;
    const hierarchicalMenuWidth = 320;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    let menuX = menuState.position.x + mainMenuWidth + 5;
    let menuY = menuState.position.y;

    if (menuX + hierarchicalMenuWidth > windowWidth - 10) {
      menuX = menuState.position.x - hierarchicalMenuWidth - 5;
    }

    if (menuX < 10) {
      menuX = 10;
    }

    if (menuY < 10) {
      menuY = 10;
    }

    const estimatedMenuHeight = Math.min(
      400,
      Object.keys(menuState.hierarchicalAnnotations).length * 60 + 100
    );
    if (menuY + estimatedMenuHeight > windowHeight - 10) {
      menuY = Math.max(10, windowHeight - estimatedMenuHeight - 10);
    }

    return { x: menuX, y: menuY };
  }, [menuState.position, menuState.hierarchicalAnnotations]);

  // Render logic
  const hasLinkedAnnotations =
    Object.keys(menuState.hierarchicalAnnotations).length > 0;
  const totalLinkedAnnotations = Object.keys(
    menuState.hierarchicalAnnotations
  ).length;

  if (!menuState.isVisible && !menuState.showHierarchicalMenu) {
    return null;
  }

  return (
    <>
      {menuState.isVisible &&
        (text || menuState.selection) &&
        createPortal(
          <ContextMenu top={menuState.position.y} left={menuState.position.x}>
            <ContextButton
              onClick={(e: React.MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();
                dispatch(setMotivation("commenting"));
              }}
            >
              Create Comment
            </ContextButton>

            {(user?.roles?.includes("admin") ||
              user?.roles?.includes("verified_scholar")) && (
              <ContextButton
                onClick={(e: React.MouseEvent) => {
                  e.preventDefault();
                  e.stopPropagation();
                  dispatch(setMotivation("scholarly"));
                }}
              >
                Create Scholarly Annotation
              </ContextButton>
            )}
            {user?.roles?.includes("admin") && (
              <ContextButton
                onClick={(e: React.MouseEvent) => {
                  e.preventDefault();
                  e.stopPropagation();
                  dispatch(setMotivation("linking"));
                }}
              >
                Add Content to Link
              </ContextButton>
            )}

            <ContextButton
              onClick={(e: React.MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();
                dispatch(setMotivation("external_reference"));
              }}
              style={{
                borderTop: "1px solid #eee",
              }}
            >
              Add External Reference 🔗
            </ContextButton>

            {hasLinkedAnnotations && (
              <ContextButton
                onClick={handleViewLinkedText}
                style={{
                  borderTop: "1px solid #eee",
                  fontWeight: "500",
                  color: "#1976d2",
                  position: "relative",
                }}
              >
                View Linked Text ({totalLinkedAnnotations} link
                {totalLinkedAnnotations !== 1 ? "s" : ""})
                <span
                  style={{
                    marginLeft: "8px",
                    fontSize: "12px",
                    color: "#666",
                  }}
                >
                  ▶
                </span>
              </ContextButton>
            )}
          </ContextMenu>,
          document.body
        )}

      {hasLinkedAnnotations &&
        menuState.showHierarchicalMenu &&
        createPortal(
          <HierarchicalLinkedTextMenu
            hierarchicalAnnotations={menuState.hierarchicalAnnotations}
            onClose={() =>
              setMenuState((prev) => ({ ...prev, showHierarchicalMenu: false }))
            }
            position={calculateHierarchicalMenuPosition()}
          />,
          document.body
        )}
    </>
  );
};

export default MenuContext;
