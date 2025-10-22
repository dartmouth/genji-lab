// src/features/documentView/components/contextMenu/MenuContext.tsx

import React, { useState, useEffect, useCallback, useRef } from "react";
import { ContextMenu, ContextButton } from "./ContextMenuComponents";
import HierarchicalLinkedTextMenu from "./HierarchicalLinkedTextMenu";
import { createPortal } from "react-dom";
import { useAuth } from "@hooks/useAuthContext";
import { useNavigate } from "react-router-dom";

import {
  useAppDispatch,
  useAppSelector,
  selectSegments,
  setMotivation,
  selectAnnotationCreate,
  // selectAllDocuments,
  fetchAllDocumentElements,
} from "@store";
import {
  createSelectionFromDOMSelection,
  LinkedTextSelection,
  getLinkedAnnotationsByAnnotation,
  HierarchicalLinkedAnnotations,
} from "@documentView/utils/linkedTextUtils";
import { RootState } from "@store";
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
  const navigate = useNavigate();
  const { user } = useAuth();
  const text = useAppSelector(selectSegments);
  const annotationCreate = useAppSelector(selectAnnotationCreate);
  // const allDocuments = useAppSelector(selectAllDocuments);

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

      const syntheticSelection: LinkedTextSelection = {
        documentId: foundDocument.id,
        documentElementId: elementId,
        text: clickedElement.textContent?.substring(0, 100) || "clicked text",
        start: 0,
        end: Math.min(50, clickedElement.textContent?.length || 50),
        sourceURI: `/DocumentElements/${elementId}`,
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
      const selection = createSelectionFromClickContext(clickedElement);

      if (!selection) {
        return;
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

  const handleViewLinkedText = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const annotationIds = Object.keys(menuState.hierarchicalAnnotations);

      // Direct navigation for single annotation
      if (annotationIds.length === 1) {
        const singleAnnotation =
          menuState.hierarchicalAnnotations[annotationIds[0]];

        // Close menus
        setMenuState((prev) => ({
          ...prev,
          isVisible: false,
          showHierarchicalMenu: false,
        }));

        // Navigate to LinkView page
        let url = `/links/${singleAnnotation.annotationId}`;
        if (singleAnnotation.clickedTargetId !== null) {
          url += `?pinned=${singleAnnotation.clickedTargetId}`;
        }
        navigate(url);
        return;
      }

      // Show hierarchical menu for multiple annotations
      setMenuState((prev) => ({
        ...prev,
        showHierarchicalMenu: true,
      }));
    },
    [menuState.hierarchicalAnnotations, navigate]
  );

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
