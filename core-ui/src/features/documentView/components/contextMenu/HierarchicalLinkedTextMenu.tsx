import React, { useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { HierarchicalLinkedAnnotations } from "@documentView/utils/linkedTextUtils";
import "@documentView/styles/ContextMenuStyles.css";
import "@documentView/styles/DocumentLinkingStyles.css";

interface HierarchicalLinkedTextMenuProps {
  hierarchicalAnnotations: HierarchicalLinkedAnnotations;
  onClose: () => void;
  position: { x: number; y: number };
}

const HierarchicalLinkedTextMenu: React.FC<HierarchicalLinkedTextMenuProps> = ({
  hierarchicalAnnotations,
  onClose,
  position,
}) => {
  const navigate = useNavigate();
  const mainMenuRef = useRef<HTMLDivElement>(null);
  const annotationIds = Object.keys(hierarchicalAnnotations);

  // Handle clicking outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isInMainMenu = mainMenuRef.current?.contains(target);

      if (!isInMainMenu) {
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
    };
  }, [onClose]);

  // Handle annotation selection - navigate to LinkView page
  const handleAnnotationSelection = (
    annotationId: string,
    clickedTargetId: number | null
  ) => {
    onClose();

    // Build the URL: /links/{annotationId}?pinned={targetId}
    let url = `/links/${annotationId}`;
    if (clickedTargetId !== null) {
      url += `?pinned=${clickedTargetId}`;
    }

    navigate(url);
  };

  if (annotationIds.length === 0) {
    return null;
  }

  return (
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
        🔗 Linked Text ({annotationIds.length})
      </div>

      {/* Annotation list */}
      {annotationIds.map((annotationId) => {
        const annotation = hierarchicalAnnotations[annotationId];

        return (
          <div
            key={annotationId}
            className="hierarchical-linked-text-menu__document-item"
          >
            <button
              onClick={() =>
                handleAnnotationSelection(
                  annotationId,
                  annotation.clickedTargetId
                )
              }
              className="hierarchical-linked-text-menu__document-button"
            >
              <div className="hierarchical-linked-text-menu__document-layout">
                <span className="hierarchical-linked-text-menu__document-icon">
                  🔗
                </span>
                <div className="hierarchical-linked-text-menu__document-details">
                  <div className="hierarchical-linked-text-menu__document-title">
                    {annotation.annotationTitle}
                  </div>
                  <div className="hierarchical-linked-text-menu__linked-text-preview">
                    {annotation.allTargetIds.length} target
                    {annotation.allTargetIds.length !== 1 ? "s" : ""}
                  </div>
                </div>
              </div>
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default HierarchicalLinkedTextMenu;
