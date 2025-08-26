import React, { useRef, useEffect } from "react";
import { LinkedDocument } from "@documentView/utils/linkedTextUtils";
import "@documentView/styles/ContextMenuStyles.css";
import "@documentView/styles/DocumentLinkingStyles.css";

interface LinkedTextDropdownProps {
  linkedDocuments: LinkedDocument[];
  onDocumentSelect: (linkedDoc: LinkedDocument) => void;
  onClose: () => void;
  position: { x: number; y: number };
}

const LinkedTextDropdown: React.FC<LinkedTextDropdownProps> = ({
  linkedDocuments,
  onDocumentSelect,
  onClose,
  position,
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Handle clicking outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
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

  const handleDocumentClick = (linkedDoc: LinkedDocument) => {
    onDocumentSelect(linkedDoc);
    onClose();
  };

  if (linkedDocuments.length === 0) {
    return null;
  }

  return (
    <div
      ref={dropdownRef}
      className="linked-text-dropdown"
      style={{
        top: `${position.y}px`,
        left: `${position.x}px`,
      }}
    >
      <div className="linked-text-dropdown__header">
        Linked Documents ({linkedDocuments.length})
      </div>

      {linkedDocuments.map((linkedDoc, index) => (
        <div
          key={`${linkedDoc.documentId}-${index}`}
          className="linked-text-dropdown__item"
          onClick={() => handleDocumentClick(linkedDoc)}
        >
          <div className="linked-text-dropdown__document-title">
            {linkedDoc.documentTitle}
          </div>
          <div className="linked-text-dropdown__linked-text">
            "
            {linkedDoc.linkedText.length > 50
              ? linkedDoc.linkedText.substring(0, 50) + "..."
              : linkedDoc.linkedText}
            "
          </div>
        </div>
      ))}
    </div>
  );
};

export default LinkedTextDropdown;
