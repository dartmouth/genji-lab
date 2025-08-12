// src/features/documentView/components/contextMenu/MenuContext.tsx
// CRITICAL FIXES - Proper selection detection, document linking, and enhanced positioning

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { ContextMenu, ContextButton } from "./ContextMenuComponents";
import HierarchicalLinkedTextMenu from "./HierarchicalLinkedTextMenu";
import { createPortal } from 'react-dom';
import { useAuth } from "@hooks/useAuthContext";
import { 
  useAppDispatch, 
  useAppSelector, 
  selectSegments, 
  setMotivation, 
  selectAnnotationCreate,
  linkingAnnotations,
  selectAllDocuments, // 🎯 This now returns ALL documents from all collections
  selectElementsByDocumentId
} from "@store";
import { 
  createSelectionFromDOMSelection, 
  LinkedTextSelection,
  getLinkedDocumentsSimple,
  HierarchicalLinkedDocuments,
  LinkedTextOption
} from '@documentView/utils/linkedTextUtils';
import { RootState } from '@store';

interface MenuContextProps {
  viewedDocuments?: Array<{
    id: number;
    collectionId: number;
    title: string;
  }>;
  onOpenLinkedDocument?: (documentId: number, collectionId: number, targetInfo: {
    sourceURI: string;
    start: number;
    end: number;
  }, allTargets?: Array<{
    sourceURI: string;
    start: number;
    end: number;
    text: string;
  }>) => void;
}

const MenuContext: React.FC<MenuContextProps> = ({
  viewedDocuments = [],
  onOpenLinkedDocument
}) => {
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const text = useAppSelector(selectSegments);
  const annotationCreate = useAppSelector(selectAnnotationCreate);
  
  // 🎯 FIXED: Get all documents from the new Redux store structure
  const allDocuments = useAppSelector(selectAllDocuments);

  // 🐛 DEBUGGING - Add this to see what we're working with
  console.log('🐛 === DEBUGGING DOCUMENT DATA ===');
  console.log('🐛 allDocuments from Redux:', allDocuments);
  console.log('🐛 allDocuments.length:', allDocuments.length);
  console.log('🐛 allDocuments structure:', allDocuments.map(doc => ({ 
    id: doc.id, 
    title: doc.title, 
    document_collection_id: doc.document_collection_id 
  })));

  console.log('🐛 viewedDocuments from props:', viewedDocuments);
  console.log('🐛 viewedDocuments.length:', viewedDocuments.length);
  console.log('🐛 viewedDocuments structure:', viewedDocuments.map(doc => ({ 
    id: doc.id, 
    title: doc.title, 
    collectionId: doc.collectionId 
  })));
  console.log('🐛 === END DEBUGGING ===');

  // 🎯 NEW: Get all elements from Redux store for all viewed documents
  const allElements = useAppSelector((state: RootState) => {
    const elements = [];
    
    // Get elements for all viewed documents
    for (const doc of viewedDocuments) {
      const docElements = selectElementsByDocumentId(state, doc.id);
      if (docElements && docElements.length > 0) {
        elements.push(...docElements);
      }
    }
    
    // Also try to get elements from any documents mentioned in annotations
    try {
      const linkingAnns = linkingAnnotations.selectors.selectAllAnnotations(state);
      for (const annotation of linkingAnns) {
        if (annotation.document_id) {
          const docElements = selectElementsByDocumentId(state, annotation.document_id);
          if (docElements && docElements.length > 0) {
            // Only add elements that aren't already in the array
            for (const element of docElements) {
              if (!elements.find(el => el.id === element.id)) {
                elements.push(element);
              }
            }
          }
        }
      }
    } catch (error) {
      console.warn('Error getting elements from annotations:', error);
    }
    
    console.log('🎯 MenuContext: Collected', elements.length, 'elements from Redux store');
    return elements;
  });
  
  // Get all linking annotations - 🎯 FIXED: Properly memoized selector
  const allLinkingAnnotations = useAppSelector(
    useMemo(() => (state: RootState) => {
      try {
        if (state.annotations?.linking) {
          const annotations = linkingAnnotations.selectors.selectAllAnnotations(state);
          console.log('🐛 allLinkingAnnotations.length:', annotations.length);
          if (annotations.length > 0) {
            console.log('🐛 Sample linking annotation:', annotations[0]);
          }
          return annotations;
        }
        return [];
      } catch (error) {
        console.warn('Error accessing linking annotations:', error);
        return [];
      }
    }, [])
  );
  
  // Menu state
  const [clicked, setClicked] = useState(false);
  const [currentSelection, setCurrentSelection] = useState<LinkedTextSelection | null>(null);
  const [hierarchicalDocuments, setHierarchicalDocuments] = useState<HierarchicalLinkedDocuments>({});
  const [showHierarchicalMenu, setShowHierarchicalMenu] = useState(false);
  const [coords, setCoords] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // 🎯 CRITICAL FIX: Create selection from DOM on right-click
  const createSelectionFromDOM = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      console.log('🔧 No DOM selection found');
      return null;
    }
    
    const selectionData = createSelectionFromDOMSelection(selection, viewedDocuments);
    if (selectionData) {
      console.log('🔧 Created selection from DOM:', selectionData);
      return selectionData;
    }
    
    console.log('🔧 Failed to create selection from DOM');
    return null;
  }, [viewedDocuments]);

  // Find hierarchical linked documents using the dynamic approach
  const findHierarchicalLinkedDocuments = useCallback((selection: LinkedTextSelection): HierarchicalLinkedDocuments => {
    console.log('🔍 Finding hierarchical linked documents for:', selection.sourceURI);
    console.log('🔍 Available elements:', allElements.length);
    console.log('🔍 Available documents:', allDocuments.length);
    console.log('🔍 Available annotations:', allLinkingAnnotations.length);
    
    const result = getLinkedDocumentsSimple(
      selection,
      allLinkingAnnotations,
      allDocuments,
      viewedDocuments,
      allElements // 🎯 FIXED: Pass the elements from Redux
    );
    console.log('🔍 Found', Object.keys(result).length, 'linked documents');
    return result;
  }, [allLinkingAnnotations, allDocuments, viewedDocuments, allElements]); // 🎯 FIXED: Add allElements dependency

  // Clear menus when annotation create changes
  useEffect(() => {
    if (annotationCreate && annotationCreate.motivation && clicked) {
      setClicked(false);
      setShowHierarchicalMenu(false);
    }
  }, [annotationCreate, clicked]);

  // 🎯 CRITICAL FIX: Enhanced context menu event handler with better positioning
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      console.log('🐛 Right-click detected at:', { x: e.clientX, y: e.clientY });
      console.log('🐛 Page scroll:', { scrollX: window.scrollX, scrollY: window.scrollY });
      console.log('🐛 Viewport size:', { width: window.innerWidth, height: window.innerHeight });
      
      // 🎯 CRITICAL: Always try to create a selection from DOM
      const domSelection = createSelectionFromDOM();
      
      // Check if we have either text selection (Redux) or DOM selection
      const hasSelection = (text && Array.isArray(text) && text.length > 0) || domSelection;
      
      if (hasSelection) {
        e.preventDefault();
        e.stopPropagation();
        
        // 🎯 CRITICAL FIX: Use clientX/Y directly without modifications
        const menuX = e.clientX;
        const menuY = e.clientY;
        
        console.log('🐛 Setting menu coordinates to:', { x: menuX, y: menuY });
        
        // 🎯 CRITICAL: Boundary checking to keep menu on screen
        const menuWidth = 200;
        const menuHeight = 150; // Estimated menu height
        
        const adjustedX = Math.min(menuX, window.innerWidth - menuWidth - 10);
        const adjustedY = Math.min(menuY, window.innerHeight - menuHeight - 10);
        
        console.log('🐛 Adjusted coordinates:', { x: adjustedX, y: adjustedY });
        
        // Set coordinates exactly where clicked (with boundary adjustments)
        setCoords({ x: adjustedX, y: adjustedY });
        setClicked(true);
        setShowHierarchicalMenu(false);
        
        // 🎯 CRITICAL: Use DOM selection if available, otherwise use Redux text
        let selectionToUse: LinkedTextSelection | null = null;
        
        if (domSelection) {
          selectionToUse = domSelection;
          console.log('🐛 Using DOM selection:', selectionToUse);
        } else if (text && text.length > 0) {
          // Create a mock selection from Redux text state
          selectionToUse = {
            documentId: viewedDocuments[0]?.id || 1,
            documentElementId: 2, // You might need to get this from Redux state
            text: Array.isArray(text) ? text.join(' ') : String(text),
            start: 0,
            end: Array.isArray(text) ? text.join(' ').length : String(text).length,
            sourceURI: '/DocumentElements/2' // You might need to get this from Redux state
          };
          console.log('🐛 Using Redux text selection:', selectionToUse);
        }
        
        if (selectionToUse) {
          setCurrentSelection(selectionToUse);
          
          // Find linked documents for this selection
          const hierarchicalDocs = findHierarchicalLinkedDocuments(selectionToUse);
          setHierarchicalDocuments(hierarchicalDocs);
          
          console.log('🐛 Context menu ready with', Object.keys(hierarchicalDocs).length, 'linked documents');
        }
        
        console.log('🐛 Context menu positioned at:', { x: adjustedX, y: adjustedY });
      } else {
        console.log('🐛 No selection available for context menu');
      }
    };

    const handleClick = (e: MouseEvent) => {
      const target = e.target as Element;
      const contextMenu = document.querySelector('.context-menu');
      const hierarchicalMenu = document.querySelector('.hierarchical-linked-text-menu');
      const hierarchicalSubmenu = document.querySelector('.linked-text-options-submenu');
      
      if (!contextMenu?.contains(target) && 
          !hierarchicalMenu?.contains(target) && 
          !hierarchicalSubmenu?.contains(target)) {
        setClicked(false);
        setShowHierarchicalMenu(false);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setClicked(false);
        setShowHierarchicalMenu(false);
      }
    };

    // 🎯 CRITICAL: Use capture: true to ensure we get the event before other handlers
    document.addEventListener("contextmenu", handleContextMenu, { capture: true, passive: false });
    document.addEventListener("click", handleClick);
    document.addEventListener("keydown", handleEscape);
    
    return () => {
      document.removeEventListener("contextmenu", handleContextMenu, { capture: true });
      document.removeEventListener("click", handleClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [text, createSelectionFromDOM, findHierarchicalLinkedDocuments, viewedDocuments]);

  // Handle viewing linked text
  const handleViewLinkedText = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('🔗 === handleViewLinkedText called ===');
    console.log('🔗 Hierarchical documents:', Object.keys(hierarchicalDocuments).length);
    
    const hierarchicalDocumentIds = Object.keys(hierarchicalDocuments).map(Number);
    
    if (hierarchicalDocumentIds.length === 1) {
      const singleDoc = hierarchicalDocuments[hierarchicalDocumentIds[0]];
      if (singleDoc.linkedTextOptions.length === 1) {
        console.log('🔗 === Direct selection (single doc, single option) ===');
        handleHierarchicalLinkedTextSelect(
          singleDoc.documentId,
          singleDoc.collectionId,
          singleDoc.linkedTextOptions[0],
          singleDoc.isCurrentlyOpen
        );
        return;
      }
    }
    
    console.log('🔗 === Showing hierarchical menu ===');
    setShowHierarchicalMenu(true);
  };

  // 🎯 CRITICAL FIX: Enhanced linked text selection handler with more debugging
  const handleHierarchicalLinkedTextSelect = useCallback((
    documentId: number,
    collectionId: number,
    option: LinkedTextOption,
    isCurrentlyOpen: boolean
  ) => {
    console.log('🔗 === MenuContext: handleHierarchicalLinkedTextSelect called ===');
    console.log('🔗 Document ID:', documentId);
    console.log('🔗 Collection ID:', collectionId);
    console.log('🔗 Is Currently Open:', isCurrentlyOpen);
    console.log('🔗 Option:', {
      text: option.linkedText.substring(0, 50) + '...',
      targetInfo: option.targetInfo,
      allTargetsCount: option.allTargets?.length || 0
    });
    
    // 🎯 CRITICAL FIX: Immediately close menus to prevent multiple clicks
    setShowHierarchicalMenu(false);
    setClicked(false);
    console.log('🔗 === Menus closed immediately ===');
    
    console.log('🔗 onOpenLinkedDocument callback exists:', !!onOpenLinkedDocument);
    console.log('🔗 onOpenLinkedDocument type:', typeof onOpenLinkedDocument);
    
    if (onOpenLinkedDocument) {
      console.log('🔗 === ABOUT TO CALL onOpenLinkedDocument ===');
      console.log('🔗 Arguments:', {
        documentId,
        collectionId,
        targetInfo: option.targetInfo,
        allTargetsLength: option.allTargets?.length || 0
      });
      
      try {
        // Use setTimeout to ensure state updates complete before callback
        setTimeout(() => {
          const result = onOpenLinkedDocument(
            documentId,
            collectionId,
            option.targetInfo,
            option.allTargets
          );
          console.log('🔗 === onOpenLinkedDocument returned ===', result);
        }, 100); // Small delay to ensure clean state
        
      } catch (error) {
        console.error('🔗 === ERROR calling onOpenLinkedDocument ===', error);
        console.error('🔗 Error stack:', error.stack);
      }
    } else {
      console.error('🔗 === ERROR: onOpenLinkedDocument callback not provided ===');
      console.error('🔗 Available props:', Object.keys({ viewedDocuments, onOpenLinkedDocument }));
    }
  }, [onOpenLinkedDocument]); 

  // 🎯 ENHANCED: Better submenu positioning logic
  const calculateHierarchicalMenuPosition = useCallback(() => {
    const mainMenuWidth = 200;
    const hierarchicalMenuWidth = 320;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    console.log('🐛 Calculating submenu position from coords:', coords);
    console.log('🐛 Window dimensions:', { width: windowWidth, height: windowHeight });
    
    // 🎯 CRITICAL: Start from the main menu position
    let menuX = coords.x + mainMenuWidth + 5; // Position to the right of main menu
    let menuY = coords.y; // Align with main menu top
    
    // 🎯 BOUNDARY CHECKING: If submenu would go off right edge, position to left
    if (menuX + hierarchicalMenuWidth > windowWidth - 10) {
      menuX = coords.x - hierarchicalMenuWidth - 5;
      console.log('🐛 Submenu positioned to left of main menu');
    }
    
    // 🎯 BOUNDARY CHECKING: Ensure submenu doesn't go off left edge when positioned left
    if (menuX < 10) {
      menuX = 10;
      console.log('🐛 Submenu moved right to avoid left edge');
    }
    
    // 🎯 BOUNDARY CHECKING: Ensure submenu doesn't go off top
    if (menuY < 10) {
      menuY = 10;
      console.log('🐛 Submenu moved down to avoid top edge');
    }
    
    // 🎯 BOUNDARY CHECKING: Ensure submenu doesn't go off bottom
    const estimatedMenuHeight = Math.min(400, Object.keys(hierarchicalDocuments).length * 60 + 100);
    if (menuY + estimatedMenuHeight > windowHeight - 10) {
      menuY = Math.max(10, windowHeight - estimatedMenuHeight - 10);
      console.log('🐛 Submenu moved up to avoid bottom edge');
    }
    
    const finalPosition = { x: menuX, y: menuY };
    console.log('🐛 Final submenu position:', finalPosition);
    
    return finalPosition;
  }, [coords, hierarchicalDocuments]);

  // Check if current selection has linked text
  const selectionHasLinks = currentSelection && Object.keys(hierarchicalDocuments).length > 0;
  const totalLinkedDocuments = Object.keys(hierarchicalDocuments).length;

  if (!clicked && !showHierarchicalMenu) {
    return null;
  }

  return (
    <>
      {/* Main context menu */}
      {clicked && (text || currentSelection) && createPortal(
        <ContextMenu top={coords.y} left={coords.x}>
          <ContextButton 
            onClick={(e: React.MouseEvent) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('🔗 === Create Comment clicked ===');
              dispatch(setMotivation("commenting"));
            }}
          >
            Create Comment
          </ContextButton>
          
          {(user?.roles?.includes('admin') || user?.roles?.includes('verified_scholar')) && (
            <ContextButton 
              onClick={(e: React.MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🔗 === Create Scholarly Annotation clicked ===');
                dispatch(setMotivation("scholarly"));
              }}
            >
              Create Scholarly Annotation
            </ContextButton>
          )}
          
          {selectionHasLinks && (
            <ContextButton 
              onClick={(e: React.MouseEvent) => {
                console.log('🔗 === View Linked Text clicked ===');
                handleViewLinkedText(e);
              }}
              style={{
                borderTop: '1px solid #eee',
                fontWeight: '500',
                color: '#1976d2',
                position: 'relative'
              }}
            >
              View Linked Text ({totalLinkedDocuments} document{totalLinkedDocuments !== 1 ? 's' : ''})
              <span style={{ 
                marginLeft: '8px', 
                fontSize: '12px',
                color: '#666' 
              }}>
                ▶
              </span>
            </ContextButton>
          )}
          
          {/* Debug info - can be removed in production */}
          {process.env.NODE_ENV === 'development' && (
            <div style={{
              borderTop: '1px solid #eee',
              padding: '4px 8px',
              fontSize: '10px',
              color: '#666',
              fontFamily: 'monospace'
            }}>
              Debug: Selection={currentSelection ? '✓' : '✗'}, 
              Links={totalLinkedDocuments}, 
              Docs={viewedDocuments.length},
              Elements={allElements.length},
              AllDocs={allDocuments.length}
            </div>
          )}
        </ContextMenu>,
        document.body
      )}

      {/* Hierarchical menu */}
      {selectionHasLinks && showHierarchicalMenu && createPortal(
        <HierarchicalLinkedTextMenu
          hierarchicalDocuments={hierarchicalDocuments}
          onLinkedTextSelect={handleHierarchicalLinkedTextSelect}
          onClose={() => setShowHierarchicalMenu(false)}
          position={calculateHierarchicalMenuPosition()}
        />,
        document.body
      )}
    </>
  );
};

export default MenuContext;