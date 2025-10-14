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

  const [menuState, setMenuState] = useState<ContextMenuState>({
    isVisible: false,
    position: { x: 0, y: 0 },
    selection: null,
    hierarchicalDocuments: {},
    showHierarchicalMenu: false,
  });

  // Use memoized selector instead of inline selector
  const allElements = useAppSelector(selectAllLoadedElements);

        const data = await response.json();

        const result: HierarchicalLinkedDocuments = {};

        data.linked_documents.forEach(
          (doc: {
            documentId: number;
            documentTitle: string;
            collectionId: number;
            linkedTextOptions: LinkedTextOption[];
          }) => {
            // 🎯 Filter out same-document links
            if (doc.documentId === sourceDocumentId) {
              return; // Skip this document
            }

            const isCurrentlyViewed = viewedDocuments.some(
              (d) => d.id === doc.documentId
            );

            result[doc.documentId] = {
              documentId: doc.documentId,
              documentTitle: doc.documentTitle,
              collectionId: doc.collectionId,
              isCurrentlyOpen: isCurrentlyViewed,
              linkedTextOptions: doc.linkedTextOptions,
            };
          }
        );

        return result;
      } catch (error) {
        console.error("Error fetching linked text info:", error);
        return {};
      }
    };

    loadAllDocumentsAndElements();
  }, [dispatch, bulkLoadingStatus]);

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
    [viewedDocuments]
  );

  useEffect(() => {
    const handleContextMenu = async (e: MouseEvent) => {
      const clickedElement = e.target as HTMLElement;

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

      const hierarchicalDocuments = await fetchLinkedTextInfo(
        selection.documentElementId,
        selection.documentId
      );

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
  }, [viewedDocuments, createSelectionFromClickContext, fetchLinkedTextInfo]);

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
    (
      documentId: number, // This is the linked document (where to navigate TO)
      collectionId: number,
      option: LinkedTextOption
    ) => {
      const sourceDocumentId = menuState.selection?.documentId;

      setMenuState((prev) => ({
        ...prev,
        isVisible: false,
        showHierarchicalMenu: false,
      }));

      if (!onOpenLinkedDocument || !sourceDocumentId) {
        console.error("Missing callback or source document ID");
        return;
      }

      try {
        // Pass the LINKED document ID (where to navigate TO)
        // The backend's documentId is correct - it's the target document
        onOpenLinkedDocument(
          documentId, // Pass Document 2 (the linked document)
          collectionId,
          option.targetInfo,
          option.allTargets
        );
      } catch (error) {
        console.error("Error executing navigation callback:", error);
      }
    },
    [onOpenLinkedDocument, menuState.selection]
  );

  const handleViewLinkedText = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const linkedDocumentIds = Object.keys(
        menuState.hierarchicalDocuments
      ).map(Number);

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
