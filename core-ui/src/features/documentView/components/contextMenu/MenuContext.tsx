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
  selectAllDocuments,
  fetchAllDocumentElements,
} from "@store";
import {
  createSelectionFromDOMSelection,
  LinkedTextSelection,
  getLinkedDocumentsSimple,
  HierarchicalLinkedDocuments,
  LinkedTextOption,
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
  onOpenLinkedDocument?: (
    linkedDocumentId: number,
    linkedCollectionId: number,
    targetInfo: {
      sourceURI: string;
      start: number;
      end: number;
    },
    allTargets?: Array<{
      sourceURI: string;
      start: number;
      end: number;
      text: string;
    }>
  ) => void;
}

interface ContextMenuState {
  isVisible: boolean;
  position: { x: number; y: number };
  selection: LinkedTextSelection | null;
  hierarchicalDocuments: HierarchicalLinkedDocuments;
  showHierarchicalMenu: boolean;
}

const MenuContext: React.FC<MenuContextProps> = ({
  viewedDocuments = [],
  onOpenLinkedDocument,
}) => {
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const text = useAppSelector(selectSegments);
  const annotationCreate = useAppSelector(selectAnnotationCreate);
  const allDocuments = useAppSelector(selectAllDocuments);

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
    hierarchicalDocuments: {},
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

  // Simple linked document discovery (no on-demand loading needed since everything is bulk loaded)
  const findLinkedDocuments = useCallback(
    (selection: LinkedTextSelection): HierarchicalLinkedDocuments => {
      try {
        const currentDocument =
          viewedDocuments.find((d) => d.id === selection.documentId) ||
          allDocuments.find((d) => d.id === selection.documentId);
        const currentDocumentTitle =
          currentDocument?.title || `Document ${selection.documentId}`;

        const interdocumentAnnotations = allLinkingAnnotations.filter((ann) => {
          return ann.target?.some((target) => {
            const elementIdMatch = target.source.match(
              /\/DocumentElements\/(\d+)/
            );
            if (elementIdMatch) {
              const elementId = parseInt(elementIdMatch[1]);
              const targetElement = allElements.find(
                (el) => el.id === elementId
              );

              if (targetElement) {
                const targetDocument =
                  allDocuments.find(
                    (d) => d.id === targetElement.document_id
                  ) ||
                  viewedDocuments.find(
                    (d) => d.id === targetElement.document_id
                  );
                const targetDocumentTitle =
                  targetDocument?.title ||
                  `Document ${targetElement.document_id}`;

                // Only include if titles are different
                return targetDocumentTitle !== currentDocumentTitle;
              }
            }
            return false;
          });
        });

        const result = getLinkedDocumentsSimple(
          selection,
          interdocumentAnnotations,
          allDocuments,
          viewedDocuments,
          allElements
        );

        return result;
      } catch (error) {
        console.error("Error in linked document discovery:", error);
        return {};
      }
    },
    [allElements, allDocuments, allLinkingAnnotations, viewedDocuments]
  );

  // Context menu event handler
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      // Don't show context menu if bulk loading hasn't completed
      if (bulkLoadingStatus !== "succeeded") {
        return;
      }

      const clickedElement = e.target as HTMLElement;

      // Find document panel
      let documentPanel = clickedElement.closest(
        "[data-document-id]"
      ) as HTMLElement;

      if (!documentPanel) {
        documentPanel = clickedElement.closest(
          ".document-content-panel"
        ) as HTMLElement;
      }

      if (!documentPanel) {
        return;
      }

      const documentId = parseInt(
        documentPanel.getAttribute("data-document-id") || "0"
      );

      const isValidDocument = viewedDocuments.some((d) => d.id === documentId);

      if (!isValidDocument) {
        return;
      }

      // Create selection from click context
      const selection = createSelectionFromClickContext(clickedElement);
      if (!selection) {
        return;
      }

      // Prevent default and calculate position
      e.preventDefault();
      e.stopPropagation();

      const position = {
        x: Math.min(e.clientX, window.innerWidth - 250),
        y: Math.min(e.clientY, window.innerHeight - 200),
      };

      // Find linked documents (now simple since all elements are loaded)
      const hierarchicalDocuments = findLinkedDocuments(selection);

      // Update menu state
      setMenuState({
        isVisible: true,
        position,
        selection,
        hierarchicalDocuments,
        showHierarchicalMenu: false,
      });
    };

    const handleClick = (e: MouseEvent) => {
      const target = e.target as Element;

      const isOutsideMenus =
        !target.closest(".context-menu") &&
        !target.closest(".hierarchical-linked-text-menu") &&
        !target.closest(".linked-text-options-submenu");

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
    findLinkedDocuments,
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

  const handleLinkedTextSelection = useCallback(
    (documentId: number, collectionId: number, option: LinkedTextOption) => {
      setMenuState((prev) => ({
        ...prev,
        isVisible: false,
        showHierarchicalMenu: false,
      }));

      if (!onOpenLinkedDocument) {
        console.error("onOpenLinkedDocument callback not provided");
        return;
      }
      try {
        setTimeout(() => {
          onOpenLinkedDocument(
            documentId,
            collectionId,
            option.targetInfo,
            option.allTargets
          );
        }, 50);
      } catch (error) {
        console.error("Error executing navigation callback:", error);
      }
    },
    [onOpenLinkedDocument]
  );

  const handleViewLinkedText = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const linkedDocumentIds = Object.keys(
        menuState.hierarchicalDocuments
      ).map(Number);

      // Direct selection for single document with single option
      if (linkedDocumentIds.length === 1) {
        const singleDoc = menuState.hierarchicalDocuments[linkedDocumentIds[0]];
        if (singleDoc.linkedTextOptions.length === 1) {
          handleLinkedTextSelection(
            singleDoc.documentId,
            singleDoc.collectionId,
            singleDoc.linkedTextOptions[0]
          );
          return;
        }
      }

      // Show hierarchical menu for multiple options
      setMenuState((prev) => ({
        ...prev,
        showHierarchicalMenu: true,
      }));
    },
    [menuState.hierarchicalDocuments, handleLinkedTextSelection]
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
      Object.keys(menuState.hierarchicalDocuments).length * 60 + 100
    );
    if (menuY + estimatedMenuHeight > windowHeight - 10) {
      menuY = Math.max(10, windowHeight - estimatedMenuHeight - 10);
    }

    return { x: menuX, y: menuY };
  }, [menuState.position, menuState.hierarchicalDocuments]);

  // Render logic
  const hasLinkedDocuments =
    Object.keys(menuState.hierarchicalDocuments).length > 0;
  const totalLinkedDocuments = Object.keys(
    menuState.hierarchicalDocuments
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
            {(user?.roles?.includes('admin')) && (
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

            {hasLinkedDocuments && (
              <ContextButton
                onClick={handleViewLinkedText}
                style={{
                  borderTop: "1px solid #eee",
                  fontWeight: "500",
                  color: "#1976d2",
                  position: "relative",
                }}
              >
                View Linked Text ({totalLinkedDocuments} document
                {totalLinkedDocuments !== 1 ? "s" : ""})
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

      {hasLinkedDocuments &&
        menuState.showHierarchicalMenu &&
        createPortal(
          <HierarchicalLinkedTextMenu
            hierarchicalDocuments={menuState.hierarchicalDocuments}
            onLinkedTextSelect={handleLinkedTextSelection}
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
