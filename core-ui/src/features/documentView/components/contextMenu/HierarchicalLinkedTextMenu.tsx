// New hierarchical context menu component
// src/features/documentView/components/contextMenu/HierarchicalLinkedTextMenu.tsx

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { HierarchicalLinkedDocuments, LinkedTextOption } from '@documentView/utils/linkedTextUtils';
import '@documentView/styles/ContextMenuStyles.css';

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
  position
}) => {
  const mainMenuRef = useRef<HTMLDivElement>(null);
  const submenuRef = useRef<HTMLDivElement>(null);
  const [activeSubmenu, setActiveSubmenu] = useState<SubmenuState>({ documentId: null, position: { x: 0, y: 0 } });
  const [submenuTimeout, setSubmenuTimeout] = useState<NodeJS.Timeout | null>(null);

  const documentIds = Object.keys(hierarchicalDocuments).map(Number);

  // Calculate submenu position
  const calculateSubmenuPosition = (mainMenuX: number, mainMenuY: number, itemIndex: number) => {
    const mainMenuWidth = 280;
    const submenuWidth = 320;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const itemHeight = 50; // Approximate height per menu item
    
    let submenuX = mainMenuX + mainMenuWidth + 5;
    let submenuY = mainMenuY + (itemIndex * itemHeight) - 10;
    
    // Check if submenu would go off right edge
    if (submenuX + submenuWidth > windowWidth) {
      submenuX = mainMenuX - submenuWidth - 5;
    }
    
    // Check bounds
    if (submenuY < 10) {
      submenuY = 10;
    }
    
    const estimatedSubmenuHeight = Math.min(300, hierarchicalDocuments[documentIds[0]]?.linkedTextOptions.length * 60 + 50);
    if (submenuY + estimatedSubmenuHeight > windowHeight) {
      submenuY = Math.max(10, windowHeight - estimatedSubmenuHeight - 10);
    }
    
    return { x: submenuX, y: submenuY };
  };

  // Handle mouse enter on document item
  const handleDocumentMouseEnter = (documentId: number, itemIndex: number) => {
    if (submenuTimeout) {
      clearTimeout(submenuTimeout);
      setSubmenuTimeout(null);
    }

    const submenuPos = calculateSubmenuPosition(position.x, position.y, itemIndex);
    setActiveSubmenu({
      documentId,
      position: submenuPos
    });
  };

  // Handle mouse leave from document item
  const handleDocumentMouseLeave = () => {
    const timeout = setTimeout(() => {
      setActiveSubmenu({ documentId: null, position: { x: 0, y: 0 } });
    }, 400); // Increased from 150ms to 400ms
    setSubmenuTimeout(timeout);
  };

  // Handle mouse enter on submenu
  const handleSubmenuMouseEnter = () => {
    if (submenuTimeout) {
      clearTimeout(submenuTimeout);
      setSubmenuTimeout(null);
    }
  };

  // Handle mouse leave from submenu
  const handleSubmenuMouseLeave = () => {
    const timeout = setTimeout(() => {
      setActiveSubmenu({ documentId: null, position: { x: 0, y: 0 } });
    }, 300); // Increased from 150ms to 300ms
    setSubmenuTimeout(timeout);
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
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
      if (submenuTimeout) {
        clearTimeout(submenuTimeout);
      }
    };
  }, [onClose, submenuTimeout]);

  // Handle direct selection when only one document has links
  const handleDirectSelection = (documentId: number, option: LinkedTextOption) => {
    const doc = hierarchicalDocuments[documentId];
    onLinkedTextSelect(documentId, doc.collectionId, option, doc.isCurrentlyOpen);
    onClose();
  };

  // Handle selection from submenu
  const handleSubmenuSelection = (documentId: number, option: LinkedTextOption) => {
    const doc = hierarchicalDocuments[documentId];
    onLinkedTextSelect(documentId, doc.collectionId, option, doc.isCurrentlyOpen);
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
          position: 'fixed',
          top: `${position.y}px`,
          left: `${position.x}px`,
          zIndex: 10002,
          backgroundColor: 'white',
          border: '1px solid #ccc',
          borderRadius: '6px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          minWidth: '280px',
          maxWidth: '320px',
          maxHeight: '400px',
          overflowY: 'auto',
          fontFamily: 'inherit'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '10px 14px',
            borderBottom: '1px solid #eee',
            fontSize: '13px',
            fontWeight: 'bold',
            color: '#333',
            backgroundColor: '#f8f9fa'
          }}
        >
          📚 Linked Documents ({documentIds.length})
        </div>

        {/* Document list */}
        {documentIds.map((documentId, index) => {
          const doc = hierarchicalDocuments[documentId];
          const hasMultipleOptions = doc.linkedTextOptions.length > 1;
          
          return (
            <div
              key={documentId}
              className="document-menu-item"
              style={{
                position: 'relative',
                borderBottom: index < documentIds.length - 1 ? '1px solid #f0f0f0' : 'none'
              }}
              onMouseEnter={() => hasMultipleOptions && handleDocumentMouseEnter(documentId, index)}
              onMouseLeave={() => hasMultipleOptions && handleDocumentMouseLeave()}
            >
              {/* Single option - direct click */}
              {!hasMultipleOptions ? (
                <button
                  onClick={() => handleDirectSelection(documentId, doc.linkedTextOptions[0])}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '12px 14px',
                    border: 'none',
                    backgroundColor: 'white',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f5f5f5';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'white';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px' }}>
                      {doc.isCurrentlyOpen ? '📄' : '📋'}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ 
                        fontWeight: '500', 
                        fontSize: '14px', 
                        color: '#333',
                        marginBottom: '2px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {doc.documentTitle}
                        {!doc.isCurrentlyOpen && (
                          <span style={{ 
                            fontSize: '11px', 
                            color: '#1976d2', 
                            fontWeight: 'normal',
                            marginLeft: '6px'
                          }}>
                            (will open)
                          </span>
                        )}
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: '#666',
                        fontStyle: 'italic',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        "{doc.linkedTextOptions[0].linkedText.length > 60 
                          ? doc.linkedTextOptions[0].linkedText.substring(0, 60) + '...' 
                          : doc.linkedTextOptions[0].linkedText}"
                      </div>
                    </div>
                  </div>
                </button>
              ) : (
                /* Multiple options - hover for submenu */
                <div
                  style={{
                    padding: '12px 14px',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s ease',
                    backgroundColor: activeSubmenu.documentId === documentId ? '#f5f5f5' : 'white'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px' }}>
                      {doc.isCurrentlyOpen ? '📄' : '📋'}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ 
                        fontWeight: '500', 
                        fontSize: '14px', 
                        color: '#333',
                        marginBottom: '2px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {doc.documentTitle}
                        {!doc.isCurrentlyOpen && (
                          <span style={{ 
                            fontSize: '11px', 
                            color: '#1976d2', 
                            fontWeight: 'normal',
                            marginLeft: '6px'
                          }}>
                            (will open)
                          </span>
                        )}
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: '#666'
                      }}>
                        {doc.linkedTextOptions.length} linked text sections
                      </div>
                    </div>
                    <span style={{ 
                      fontSize: '14px', 
                      color: '#999',
                      marginLeft: '4px'
                    }}>
                      ▶
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Submenu for document with multiple options */}
      {activeSubmenu.documentId && hierarchicalDocuments[activeSubmenu.documentId] && createPortal(
        <div
          ref={submenuRef}
          className="linked-text-options-submenu"
          style={{
            position: 'fixed',
            top: `${activeSubmenu.position.y}px`,
            left: `${activeSubmenu.position.x}px`,
            zIndex: 10003,
            backgroundColor: 'white',
            border: '1px solid #ccc',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            minWidth: '300px',
            maxWidth: '350px',
            maxHeight: '300px',
            overflowY: 'auto',
            fontFamily: 'inherit'
          }}
          onMouseEnter={handleSubmenuMouseEnter}
          onMouseLeave={handleSubmenuMouseLeave}
        >
          {/* Submenu header */}
          <div
            style={{
              padding: '10px 14px',
              borderBottom: '1px solid #eee',
              fontSize: '12px',
              fontWeight: 'bold',
              color: '#666',
              backgroundColor: '#f8f9fa'
            }}
          >
            🔗 {hierarchicalDocuments[activeSubmenu.documentId].documentTitle}
          </div>

          {/* Linked text options */}
          {hierarchicalDocuments[activeSubmenu.documentId].linkedTextOptions.map((option, index) => (
            <button
              key={`${activeSubmenu.documentId}-${index}`}
              onClick={() => handleSubmenuSelection(activeSubmenu.documentId!, option)}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '12px 14px',
                border: 'none',
                borderBottom: index < hierarchicalDocuments[activeSubmenu.documentId!].linkedTextOptions.length - 1 ? '1px solid #f0f0f0' : 'none',
                backgroundColor: 'white',
                cursor: 'pointer',
                transition: 'background-color 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f5f5f5';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'white';
              }}
            >
              <div style={{
                fontSize: '13px',
                color: '#333',
                lineHeight: '1.4',
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                textOverflow: 'ellipsis'
              }}>
                "{option.linkedText}"
              </div>
              {option.allTargets && option.allTargets.length > 1 && (
                <div style={{
                  fontSize: '11px',
                  color: '#1976d2',
                  marginTop: '4px',
                  fontStyle: 'italic'
                }}>
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