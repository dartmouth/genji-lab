// src/features/documentView/components/contextMenu/LinkedTextDropdown.tsx

import React, { useRef, useEffect } from 'react';
import { LinkedDocument } from '@documentView/utils/linkedTextUtils';
import '@documentView/styles/ContextMenuStyles.css';

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
  position
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Handle clicking outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
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
        position: 'fixed',
        top: `${position.y}px`,
        left: `${position.x}px`,
        zIndex: 10000,
        backgroundColor: 'white',
        border: '1px solid #ccc',
        borderRadius: '4px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        minWidth: '200px',
        maxWidth: '300px',
        maxHeight: '200px',
        overflowY: 'auto'
      }}
    >
      <div
        style={{
          padding: '8px 12px',
          borderBottom: '1px solid #eee',
          fontSize: '12px',
          fontWeight: 'bold',
          color: '#666',
          backgroundColor: '#f8f9fa'
        }}
      >
        Linked Documents ({linkedDocuments.length})
      </div>
      
      {linkedDocuments.map((linkedDoc, index) => (
        <div
          key={`${linkedDoc.documentId}-${index}`}
          className="linked-document-item"
          onClick={() => handleDocumentClick(linkedDoc)}
          style={{
            padding: '10px 12px',
            cursor: 'pointer',
            borderBottom: index < linkedDocuments.length - 1 ? '1px solid #f0f0f0' : 'none',
            transition: 'background-color 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f5f5f5';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <div
            style={{
              fontWeight: '500',
              fontSize: '13px',
              color: '#333',
              marginBottom: '4px'
            }}
          >
            {linkedDoc.documentTitle}
          </div>
          <div
            style={{
              fontSize: '11px',
              color: '#666',
              fontStyle: 'italic',
              lineHeight: '1.3',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            "{linkedDoc.linkedText.length > 50 
              ? linkedDoc.linkedText.substring(0, 50) + '...' 
              : linkedDoc.linkedText}"
          </div>
        </div>
      ))}
    </div>
  );
};

export default LinkedTextDropdown;