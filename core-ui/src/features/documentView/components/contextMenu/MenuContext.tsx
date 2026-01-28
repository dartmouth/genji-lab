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
import {
  getTextTargets,
  findTargetForParagraph,
} from "@/features/documentView/components/highlightedContent/utils";

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

  const allLinkingAnnotations = useAppSelector(selectAllLinkingAnnotations);
  const allElements = useAppSelector(selectAllLoadedElements);

  const [menuState, setMenuState] = useState<ContextMenuState>({
    isVisible: false,
    position: { x: 0, y: 0 },
    selection: null,
    hierarchicalAnnotations: {},
    showHierarchicalMenu: false,
  });

  // Store the latest hovered highlights in a ref so we can access them in event handlers
  const hoveredHighlightsRef = useRef<Record<number, string[]>>({});

  // Subscribe to hovered highlights and update ref
  const allHoveredHighlights = useAppSelector(
    (state: RootState) => state.highlightRegistry.hoveredHighlightIds
  );

  useEffect(() => {
    hoveredHighlightsRef.current = allHoveredHighlights;
  }, [allHoveredHighlights]);

  const createSelectionFromClickContext = useCallback(
    (clickedElement: HTMLElement): LinkedTextSelection | null => {
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

      let elementContainer: HTMLElement | null = clickedElement;
      let elementId: number | null = null;

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

      if (!elementId) {
        elementContainer = clickedElement;
        while (elementContainer) {
          if (elementContainer.id && /^\d+$/.test(elementContainer.id)) {
            const potentialId = parseInt(elementContainer.id);
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

      const element = allElements.find(
        (el) => el.id === elementId && el.document_id === documentId
      );
      if (!element) {
        return null;
      }

      const syntheticSelection: LinkedTextSelection = {
        documentId: foundDocument.id,
        documentElementId: elementId,
        text: clickedElement.textContent?.substring(0, 100) || "clicked text",
        start: 0,
        end: Math.min(50, clickedElement.textContent?.length || 50),
        sourceURI: `DocumentElements/${elementId}`,
        isSyntheticSelection: true,
      };

      return syntheticSelection;
    },
    [viewedDocuments, allElements]
  );

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

  const calculateContextMenuPosition = useCallback(
    (
      clickX: number,
      clickY: number,
      menuItemCount: number
    ): { x: number; y: number } => {
      // Estimate menu dimensions
      const menuWidth = 250; // Approximate width of context menu
      const menuItemHeight = 40; // Approximate height per menu item
      const menuPadding = 20; // Top and bottom padding
      const estimatedMenuHeight = menuItemCount * menuItemHeight + menuPadding;

      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      const margin = 10; // Margin from edges

      let menuX = clickX;
      let menuY = clickY;

      // Check if menu goes off right edge
      if (menuX + menuWidth > windowWidth - margin) {
        menuX = windowWidth - menuWidth - margin;
      }

      // Check if menu goes off left edge
      if (menuX < margin) {
        menuX = margin;
      }

      // Check if menu goes off bottom edge
      if (menuY + estimatedMenuHeight > windowHeight - margin) {
        // Try positioning above the click point first
        const aboveY = clickY - estimatedMenuHeight;
        if (aboveY >= margin) {
          menuY = aboveY;
        } else {
          // If it doesn't fit above, position at bottom with scroll
          menuY = windowHeight - estimatedMenuHeight - margin;
          if (menuY < margin) {
            menuY = margin;
          }
        }
      }

      // Check if menu goes off top edge
      if (menuY < margin) {
        menuY = margin;
      }

      return { x: menuX, y: menuY };
    },
    []
  );

  useEffect(() => {
    const handleContextMenu = async (e: MouseEvent) => {
      const clickedElement = e.target as HTMLElement;
      let selection: LinkedTextSelection | null = null;

      // Find which document we're in
      const documentPanel = clickedElement.closest(
        "[data-document-id]"
      ) as HTMLElement;
      if (!documentPanel) return;

      const documentId = parseInt(
        documentPanel.getAttribute("data-document-id") || "0"
      );

      // Check hovered highlights from Redux
      const hoveredHighlights = Array.isArray(
        hoveredHighlightsRef.current[documentId]
      )
        ? hoveredHighlightsRef.current[documentId]
        : [];

      // Get all linking highlights (not just the first one)
      const linkingHighlightIds = hoveredHighlights.filter(
        (id): id is string =>
          typeof id === "string" && id.startsWith("linking-")
      );

      if (linkingHighlightIds.length > 0) {
        // Collect all the ranges from all linking highlights
        const allRanges: Array<{
          start: number;
          end: number;
          paragraphId: string;
        }> = [];

        linkingHighlightIds.forEach((highlightId) => {
          const match = highlightId.match(/^linking-(\d+)-(.+)$/);
          if (match) {
            const annotationId = match[1];
            const paragraphId = match[2];

            const annotation = allLinkingAnnotations.find(
              (a) => a.id.toString() === annotationId
            );

            if (annotation) {
              const textTargets = getTextTargets(annotation.target);
              const target = findTargetForParagraph(textTargets, paragraphId);

              if (target?.selector) {
                allRanges.push({
                  start: target.selector.refined_by.start,
                  end: target.selector.refined_by.end,
                  paragraphId: paragraphId,
                });
              }
            }
          }
        });

        if (allRanges.length > 0) {
          // Find the combined range that encompasses all linking highlights
          const minStart = Math.min(...allRanges.map((r) => r.start));
          const maxEnd = Math.max(...allRanges.map((r) => r.end));
          const paragraphId = allRanges[0].paragraphId; // They should all be the same paragraph

          // Get the text content from the paragraph element
          const paragraphElement = document.getElementById(paragraphId);
          const paragraphText = paragraphElement?.textContent || "";

          // Extract element ID from paragraphId
          const elementMatch = paragraphId.match(/DocumentElements\/(\d+)/);
          const elementId = elementMatch ? parseInt(elementMatch[1]) : 0;

          // Find the document info
          const foundDocument = viewedDocuments.find(
            (d) => d.id === documentId
          );

          if (foundDocument) {
            // Create selection that spans ALL the linking highlights
            selection = {
              documentId: foundDocument.id,
              documentElementId: elementId,
              sourceURI: paragraphId,
              start: minStart,
              end: maxEnd,
              text: paragraphText.substring(minStart, maxEnd),
              isSyntheticSelection: false,
            };
          }
        }
      }

      // Only create synthetic selection if we didn't find any linking highlights
      if (!selection) {
        selection = createSelectionFromClickContext(clickedElement);
      }

      if (!selection) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      const hierarchicalAnnotations = findLinkedAnnotations(selection);

      // Count menu items to calculate proper positioning
      let menuItemCount = 2; // "Create Comment" + "Add External Reference"

      if (
        user?.roles?.includes("admin") ||
        user?.roles?.includes("verified_scholar")
      ) {
        menuItemCount++; // "Create Scholarly Annotation"
      }

      if (
        user?.roles?.includes("admin") ||
        user?.roles?.includes("verified_scholar")
      ) {
        menuItemCount++; // "Add Content to Link"
      }

      if (Object.keys(hierarchicalAnnotations).length > 0) {
        menuItemCount++; // "View Linked Text"
      }

      // Calculate position that keeps menu on screen
      const position = calculateContextMenuPosition(
        e.clientX,
        e.clientY,
        menuItemCount
      );

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
    allLinkingAnnotations,
    calculateContextMenuPosition,
    user?.roles,
  ]);

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
            {(user?.roles?.includes("admin") ||
              user?.roles?.includes("verified_scholar")) && (
              <ContextButton
                onClick={(e: React.MouseEvent) => {
                  e.preventDefault();
                  e.stopPropagation();
                  dispatch(setMotivation("linking"));
                }}
              >
                Add Content to Intertext Link
              </ContextButton>
            )}

            {(user?.roles?.includes("admin") ||
              user?.roles?.includes("verified_scholar")) && (
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
            )}

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
