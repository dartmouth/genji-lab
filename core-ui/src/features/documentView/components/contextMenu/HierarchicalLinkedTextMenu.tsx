// src/features/documentView/components/contextMenu/HierarchicalLinkedTextMenu.tsx
// FIXED: Stable submenu with no flickering

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
  
  // 🎯 FIX: Single timeout ref and longer delays
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const documentIds = Object.keys(hierarchicalDocuments).map(Number);

  // 🎯 FIX: Clear any existing timeout
  const clearExistingTimeout = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  // Calculate submenu position
  const calculateSubmenuPosition = (mainMenuX: number, mainMenuY: number, itemIndex: number) => {
    const mainMenuWidth = 280;
    const submenuWidth = 320;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const itemHeight = 50;
    
    console.log('🎯 Calculating submenu position:', {
      mainMenuX,
      mainMenuY,
      itemIndex,
      windowWidth,
      windowHeight
    });
    
    // 🎯 CRITICAL: Calculate position relative to the hovered item
    let submenuX = mainMenuX + mainMenuWidth + 5;
    let submenuY = mainMenuY + (itemIndex * itemHeight) - 10;
    
    // 🎯 BOUNDARY CHECK: Right edge
    if (submenuX + submenuWidth > windowWidth - 10) {
      submenuX = mainMenuX - submenuWidth - 5;
      console.log('🎯 Submenu positioned to left due to right boundary');
    }
    
    // 🎯 BOUNDARY CHECK: Left edge (when positioned to left)
    if (submenuX < 10) {
      submenuX = 10;
      console.log('🎯 Submenu repositioned due to left boundary');
    }
    
    // 🎯 BOUNDARY CHECK: Top edge
    if (submenuY < 10) {
      submenuY = 10;
      console.log('🎯 Submenu repositioned due to top boundary');
    }
    
    // 🎯 BOUNDARY CHECK: Bottom edge
    const currentDoc = hierarchicalDocuments[documentIds[0]];
    const estimatedSubmenuHeight = Math.min(300, (currentDoc?.linkedTextOptions.length || 1) * 60 + 80);
    
    if (submenuY + estimatedSubmenuHeight > windowHeight - 10) {
      submenuY = Math.max(10, windowHeight - estimatedSubmenuHeight - 10);
      console.log('🎯 Submenu repositioned due to bottom boundary');
    }
    
    const finalPosition = { x: submenuX, y: submenuY };
    console.log('🎯 Final submenu position:', finalPosition);
    
    return finalPosition;
  };

  // 🎯 FIX: Immediate submenu show with no delay
  const handleDocumentMouseEnter = (documentId: number, itemIndex: number) => {
    clearExistingTimeout();

    const submenuPos = calculateSubmenuPosition(position.x, position.y, itemIndex);
    setActiveSubmenu({
      documentId,
      position: submenuPos
    });
  };

  // 🎯 FIX: Longer delay before hiding + check if mouse is moving toward submenu
  const handleDocumentMouseLeave = (e: React.MouseEvent) => {
    clearExistingTimeout();
    
    // 🎯 FIX: Much longer delay and check mouse direction
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
      
      const isOverSubmenu = mouseX >= rect.left && mouseX <= rect.right && 
                           mouseY >= rect.top && mouseY <= rect.bottom;
      
      if (!isOverSubmenu) {
        setActiveSubmenu({ documentId: null, position: { x: 0, y: 0 } });
      }
    }, 800); // Increased from 400ms to 800ms
  };

  // 🎯 FIX: Cancel hide when entering submenu
  const handleSubmenuMouseEnter = () => {
    clearExistingTimeout();
  };

  // 🎯 FIX: Shorter delay when leaving submenu
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
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
      clearExistingTimeout();
    };
  }, [onClose]);

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
              onMouseLeave={hasMultipleOptions ? handleDocumentMouseLeave : undefined}
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

      {/* 🎯 FIX: Submenu with better positioning and stable hover */}
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