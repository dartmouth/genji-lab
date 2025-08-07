// src/features/documentView/components/contextMenu/MenuContext.tsx
// CLEAN WORKING VERSION - Restored to working state

import React, { useState, useEffect, useCallback } from "react";
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
  selectAllDocuments
} from "@store";
import { 
  // createSelectionFromDOMSelection, 
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
  
  // Get all documents from the store
  const allDocuments = useAppSelector(selectAllDocuments);
  
  // Get all linking annotations
  const allLinkingAnnotations = useAppSelector(
    useCallback((state: RootState) => {
      try {
        if (state.annotations?.linking) {
          return linkingAnnotations.selectors.selectAllAnnotations(state);
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

  // Find hierarchical linked documents using the simplified approach
  const findHierarchicalLinkedDocuments = useCallback((selection: LinkedTextSelection): HierarchicalLinkedDocuments => {
    return getLinkedDocumentsSimple(
      selection,
      allLinkingAnnotations,
      allDocuments,
      viewedDocuments
    );
  }, [allLinkingAnnotations, allDocuments, viewedDocuments]);

  // Manual trigger for testing - WORKING VERSION
  useEffect(() => {
    const manualTrigger = () => {
      console.log('🐛 === MANUAL TRIGGER TEST ===');
      console.log('🐛 Current text:', text);
      console.log('🐛 Viewed documents:', viewedDocuments);
      
      if (text && Array.isArray(text) && text.length > 0) {
        // Simulate a selection on DocumentElements/2
        const mockSelection = {
          documentId: viewedDocuments[0]?.id || 1,
          documentElementId: 2,
          text: 'test selection',
          start: 0,
          end: 13,
          sourceURI: '/DocumentElements/2'
        };
        
        console.log('🐛 Testing with mock selection:', mockSelection);
        setCurrentSelection(mockSelection);
        
        const hierarchicalDocs = findHierarchicalLinkedDocuments(mockSelection);
        setHierarchicalDocuments(hierarchicalDocs);
        console.log('🐛 Found hierarchical documents:', Object.keys(hierarchicalDocs).length);
        
        console.log('🐛 Manual test completed - should show links now');
      }
    };
    
    // Trigger test after a short delay
    const timeout = setTimeout(manualTrigger, 100);
    
    return () => clearTimeout(timeout);
  }, [text, viewedDocuments, findHierarchicalLinkedDocuments]);

  // Clear menus when annotation create changes
  useEffect(() => {
    if (annotationCreate && annotationCreate.motivation && clicked) {
      setClicked(false);
      setShowHierarchicalMenu(false);
    }
  }, [annotationCreate, clicked]);

  // Main context menu event handler
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      console.log('🐛 Right-click detected at:', { x: e.clientX, y: e.clientY });
      
      if (text && Array.isArray(text) && text.length > 0) {
        e.preventDefault();
        e.stopPropagation();
        
        // Set coordinates exactly where clicked
        setCoords({ x: e.clientX, y: e.clientY });
        setClicked(true);
        setShowHierarchicalMenu(false);
        
        console.log('🐛 Context menu positioned at:', { x: e.clientX, y: e.clientY });
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

    document.addEventListener("contextmenu", handleContextMenu, true);
    document.addEventListener("click", handleClick);
    document.addEventListener("keydown", handleEscape);
    
    return () => {
      document.removeEventListener("contextmenu", handleContextMenu, true);
      document.removeEventListener("click", handleClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [text]);

  // Handle viewing linked text
  const handleViewLinkedText = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const hierarchicalDocumentIds = Object.keys(hierarchicalDocuments).map(Number);
    
    if (hierarchicalDocumentIds.length === 1) {
      const singleDoc = hierarchicalDocuments[hierarchicalDocumentIds[0]];
      if (singleDoc.linkedTextOptions.length === 1) {
        handleHierarchicalLinkedTextSelect(
          singleDoc.documentId,
          singleDoc.collectionId,
          singleDoc.linkedTextOptions[0],
          singleDoc.isCurrentlyOpen
        );
        return;
      }
    }
    
    setShowHierarchicalMenu(true);
  };

  // Handle hierarchical linked text selection
  const handleHierarchicalLinkedTextSelect = (
    documentId: number,
    collectionId: number,
    option: LinkedTextOption,
    isCurrentlyOpen: boolean
  ) => {
    console.log('=== MenuContext: handleHierarchicalLinkedTextSelect called ===');
    console.log('Document ID:', documentId);
    console.log('Collection ID:', collectionId);
    console.log('Is Currently Open:', isCurrentlyOpen);
    console.log('onOpenLinkedDocument callback exists:', !!onOpenLinkedDocument);
    
    if (onOpenLinkedDocument) {
      console.log('=== Calling onOpenLinkedDocument ===');
      try {
        onOpenLinkedDocument(
          documentId,
          collectionId,
          option.targetInfo,
          option.allTargets
        );
        console.log('=== onOpenLinkedDocument called successfully ===');
      } catch (error) {
        console.error('=== ERROR calling onOpenLinkedDocument ===', error);
      }
    } else {
      console.error('=== ERROR: onOpenLinkedDocument callback not provided ===');
    }
    
    setShowHierarchicalMenu(false);
    setClicked(false);
  };

  // Calculate hierarchical menu position
  const calculateHierarchicalMenuPosition = () => {
    const mainMenuWidth = 200;
    const hierarchicalMenuWidth = 320;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    let menuX = coords.x + mainMenuWidth + 5;
    let menuY = coords.y;
    
    if (menuX + hierarchicalMenuWidth > windowWidth) {
      menuX = coords.x - hierarchicalMenuWidth - 5;
    }
    
    if (menuY < 10) {
      menuY = 10;
    }
    
    const estimatedMenuHeight = Math.min(400, Object.keys(hierarchicalDocuments).length * 60 + 50);
    if (menuY + estimatedMenuHeight > windowHeight - 10) {
      menuY = Math.max(10, windowHeight - estimatedMenuHeight - 10);
    }
    
    return { x: menuX, y: menuY };
  };

  // Check if current selection has linked text
  const selectionHasLinks = currentSelection && Object.keys(hierarchicalDocuments).length > 0;
  const totalLinkedDocuments = Object.keys(hierarchicalDocuments).length;

  if (!clicked && !showHierarchicalMenu) {
    return null;
  }

  return (
    <>
      {/* Main context menu */}
      {clicked && text && createPortal(
        <ContextMenu top={coords.y} left={coords.x}>
          <ContextButton 
            onClick={(e: React.MouseEvent) => {
              e.preventDefault();
              e.stopPropagation();
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
                dispatch(setMotivation("scholarly"));
              }}
            >
              Create Scholarly Annotation
            </ContextButton>
          )}
          
          {selectionHasLinks && (
            <ContextButton 
              onClick={handleViewLinkedText}
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