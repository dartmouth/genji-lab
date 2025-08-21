import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  HierarchicalLinkedDocuments,
  LinkedTextOption,
} from "@documentView/utils/linkedTextUtils";
import "@documentView/styles/ContextMenuStyles.css";
import "@documentView/styles/DocumentLinkingStyles.css";

interface HierarchicalLinkedTextMenuProps {
  hierarchicalDocuments: HierarchicalLinkedDocuments;
  onLinkedTextSelect: (
    documentId: number,
    collectionId: number,
    option: LinkedTextOption,
    isCurrentlyOpen: boolean
  ) => void;
  onClose: () => void;
  position: { x: number; y: number };
}

interface SubmenuState {
  documentId: number | null;
  position: { x: number; y: number };
}

const HierarchicalLinkedTextMenu: React.FC<HierarchicalLinkedTextMenuProps> = ({
  hierarchicalDocuments,
  onLinkedTextSelect,
  onClose,
  position,
}) => {
  const mainMenuRef = useRef<HTMLDivElement>(null);
  const submenuRef = useRef<HTMLDivElement>(null);
  const [activeSubmenu, setActiveSubmenu] = useState<SubmenuState>({
    documentId: null,
    position: { x: 0, y: 0 },
  });

  // Single timeout ref and longer delays
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const documentIds = Object.keys(hierarchicalDocuments).map(Number);

  // Clear any existing timeout
  const clearExistingTimeout = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  // Calculate submenu position
  const calculateSubmenuPosition = (
    mainMenuX: number,
    mainMenuY: number,
    itemIndex: number
  ) => {
    const mainMenuWidth = 280;
    const submenuWidth = 320;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const itemHeight = 50;

    // Calculate position relative to the hovered item
    let submenuX = mainMenuX + mainMenuWidth + 5;
    let submenuY = mainMenuY + itemIndex * itemHeight - 10;

    // Right edge
    if (submenuX + submenuWidth > windowWidth - 10) {
      submenuX = mainMenuX - submenuWidth - 5;
    }

    // Left edge (when positioned to left)
    if (submenuX < 10) {
      submenuX = 10;
    }

    // Top edge
    if (submenuY < 10) {
      submenuY = 10;
    }

    // Bottom edge
    const currentDoc = hierarchicalDocuments[documentIds[0]];
    const estimatedSubmenuHeight = Math.min(
      300,
      (currentDoc?.linkedTextOptions.length || 1) * 60 + 80
    );

    if (submenuY + estimatedSubmenuHeight > windowHeight - 10) {
      submenuY = Math.max(10, windowHeight - estimatedSubmenuHeight - 10);
    }

    const finalPosition = { x: submenuX, y: submenuY };

    return finalPosition;
  };

  // Immediate submenu show with no delay
  const handleDocumentMouseEnter = (documentId: number, itemIndex: number) => {
    clearExistingTimeout();

    const submenuPos = calculateSubmenuPosition(
      position.x,
      position.y,
      itemIndex
    );
    setActiveSubmenu({
      documentId,
      position: submenuPos,
    });
  };

  // Longer delay before hiding + check if mouse is moving toward submenu
  const handleDocumentMouseLeave = (e: React.MouseEvent) => {
    clearExistingTimeout();

    // Much longer delay and check mouse direction
    timeoutRef.current = setTimeout(() => {
      // Only hide if mouse isn't over submenu
      const submenuElement = submenuRef.current;
      if (!submenuElement) {
        setActiveSubmenu({ documentId: null, position: { x: 0, y: 0 } });
        return;
      }

      // Check if mouse is over submenu
      const rect = submenuElement.getBoundingClientRect();
      const mouseX = e.clientX;
      const mouseY = e.clientY;

      const isOverSubmenu =
        mouseX >= rect.left &&
        mouseX <= rect.right &&
        mouseY >= rect.top &&
        mouseY <= rect.bottom;

      if (!isOverSubmenu) {
        setActiveSubmenu({ documentId: null, position: { x: 0, y: 0 } });
      }
    }, 800);
  };

  // Cancel hide when entering submenu
  const handleSubmenuMouseEnter = () => {
    clearExistingTimeout();
  };

  // Shorter delay when leaving submenu
  const handleSubmenuMouseLeave = () => {
    clearExistingTimeout();

    timeoutRef.current = setTimeout(() => {
      setActiveSubmenu({ documentId: null, position: { x: 0, y: 0 } });
    }, 300);
  };

  // Handle clicking outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isInMainMenu = mainMenuRef.current?.contains(target);
      const isInSubmenu = submenuRef.current?.contains(target);

      if (!isInMainMenu && !isInSubmenu) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
      clearExistingTimeout();
    };
  }, [onClose]);

  // Handle direct selection when only one document has links
  const handleDirectSelection = (
    documentId: number,
    option: LinkedTextOption
  ) => {
    const doc = hierarchicalDocuments[documentId];
    onLinkedTextSelect(
      documentId,
      doc.collectionId,
      option,
      doc.isCurrentlyOpen
    );
    onClose();
  };

  // Handle selection from submenu
  const handleSubmenuSelection = (
    documentId: number,
    option: LinkedTextOption
  ) => {
    const doc = hierarchicalDocuments[documentId];
    onLinkedTextSelect(
      documentId,
      doc.collectionId,
      option,
      doc.isCurrentlyOpen
    );
    onClose();
  };

  if (documentIds.length === 0) {
    return null;
  }

  return (
    <>
      {/* Main menu */}
      <div
        ref={mainMenuRef}
        className="hierarchical-linked-text-menu"
        style={{
          top: `${position.y}px`,
          left: `${position.x}px`,
        }}
      >
        {/* Header */}
        <div className="hierarchical-linked-text-menu__header">
          📚 Linked Documents ({documentIds.length})
        </div>

        {/* Document list */}
        {documentIds.map((documentId, index) => {
          const doc = hierarchicalDocuments[documentId];
          const hasMultipleOptions = doc.linkedTextOptions.length > 1;

          return (
            <div
              key={documentId}
              className="hierarchical-linked-text-menu__document-item"
              onMouseEnter={() =>
                hasMultipleOptions &&
                handleDocumentMouseEnter(documentId, index)
              }
              onMouseLeave={
                hasMultipleOptions ? handleDocumentMouseLeave : undefined
              }
            >
              {/* Single option - direct click */}
              {!hasMultipleOptions ? (
                <button
                  onClick={() =>
                    handleDirectSelection(documentId, doc.linkedTextOptions[0])
                  }
                  className="hierarchical-linked-text-menu__document-button"
                >
                  <div className="hierarchical-linked-text-menu__document-layout">
                    <span className="hierarchical-linked-text-menu__document-icon">
                      {doc.isCurrentlyOpen ? "📄" : "📋"}
                    </span>
                    <div className="hierarchical-linked-text-menu__document-details">
                      <div className="hierarchical-linked-text-menu__document-title">
                        {doc.documentTitle}
                        {!doc.isCurrentlyOpen && (
                          <span className="hierarchical-linked-text-menu__open-indicator">
                            (will open)
                          </span>
                        )}
                      </div>
                      <div className="hierarchical-linked-text-menu__linked-text-preview">
                        "
                        {doc.linkedTextOptions[0].linkedText.length > 60
                          ? doc.linkedTextOptions[0].linkedText.substring(
                              0,
                              60
                            ) + "..."
                          : doc.linkedTextOptions[0].linkedText}
                        "
                      </div>
                    </div>
                  </div>
                </button>
              ) : (
                /* Multiple options - hover for submenu */
                <div
                  className={`hierarchical-linked-text-menu__document-content ${
                    activeSubmenu.documentId === documentId
                      ? "hierarchical-linked-text-menu__document-content--active"
                      : ""
                  }`}
                >
                  <div className="hierarchical-linked-text-menu__document-layout">
                    <span className="hierarchical-linked-text-menu__document-icon">
                      {doc.isCurrentlyOpen ? "📄" : "📋"}
                    </span>
                    <div className="hierarchical-linked-text-menu__document-details">
                      <div className="hierarchical-linked-text-menu__document-title">
                        {doc.documentTitle}
                        {!doc.isCurrentlyOpen && (
                          <span className="hierarchical-linked-text-menu__open-indicator">
                            (will open)
                          </span>
                        )}
                      </div>
                      <div className="hierarchical-linked-text-menu__options-count">
                        {doc.linkedTextOptions.length} linked text sections
                      </div>
                    </div>
                    <span className="hierarchical-linked-text-menu__arrow">
                      ▶
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Submenu positioning and stable hover */}
      {activeSubmenu.documentId &&
        hierarchicalDocuments[activeSubmenu.documentId] &&
        createPortal(
          <div
            ref={submenuRef}
            className="linked-text-options-submenu"
            style={{
              top: `${activeSubmenu.position.y}px`,
              left: `${activeSubmenu.position.x}px`,
            }}
            onMouseEnter={handleSubmenuMouseEnter}
            onMouseLeave={handleSubmenuMouseLeave}
          >
            {/* Submenu header */}
            <div className="linked-text-options-submenu__header">
              🔗 {hierarchicalDocuments[activeSubmenu.documentId].documentTitle}
            </div>

            {/* Linked text options */}
            {hierarchicalDocuments[
              activeSubmenu.documentId
            ].linkedTextOptions.map((option, index) => (
              <button
                key={`${activeSubmenu.documentId}-${index}`}
                onClick={() =>
                  handleSubmenuSelection(activeSubmenu.documentId!, option)
                }
                className="linked-text-options-submenu__option"
              >
                <div className="linked-text-options-submenu__option-text">
                  "{option.linkedText}"
                </div>
                {option.allTargets && option.allTargets.length > 1 && (
                  <div className="linked-text-options-submenu__additional-sections">
                    + {option.allTargets.length - 1} more linked sections
                  </div>
                )}
              </button>
            ))}
          </div>,
          document.body
        )}
    </>
  );
};

export default HierarchicalLinkedTextMenu;
