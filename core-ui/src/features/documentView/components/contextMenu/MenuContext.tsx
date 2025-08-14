// src/features/documentView/components/contextMenu/MenuContext.tsx
// COMPLETE REWRITE - Enhanced cross-document navigation with robust element loading

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
  selectAllDocuments,
  selectElementsByDocumentId,
  fetchDocumentElements
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

interface DocumentElement {
  id: number;
  document_id: number;
  content?: any;
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
  onOpenLinkedDocument
}) => {
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const text = useAppSelector(selectSegments);
  const annotationCreate = useAppSelector(selectAnnotationCreate);
  const allDocuments = useAppSelector(selectAllDocuments);

  // Centralized menu state
  const [menuState, setMenuState] = useState<ContextMenuState>({
    isVisible: false,
    position: { x: 0, y: 0 },
    selection: null,
    hierarchicalDocuments: {},
    showHierarchicalMenu: false
  });

  // Element loading state
  const [elementsLoadingStatus, setElementsLoadingStatus] = useState<{
    loaded: Set<number>;
    loading: Set<number>;
    failed: Set<number>;
  }>({
    loaded: new Set(),
    loading: new Set(),
    failed: new Set()
  });

  // 🚀 ENHANCED: Aggressive cross-document element preloading
  const preloadCriticalElements = useCallback(async () => {
    console.log('🚀 === AGGRESSIVE CROSS-DOCUMENT ELEMENT PRELOADING ===');
    
    // Critical documents based on database analysis
    const criticalDocuments = [1, 2, 21]; // Expanded to include primary document
    
    // Get all document IDs that have annotations
    const annotatedDocuments = new Set<number>();
    try {
      const annotations = linkingAnnotations.selectors.selectAllAnnotations({ annotations: { linking: linkingAnnotations.reducer({}, { type: 'dummy' }) } } as RootState);
      annotations.forEach(ann => {
        if (ann.document_id) annotatedDocuments.add(ann.document_id);
      });
    } catch (error) {
      console.warn('🚀 Could not access annotations for preloading:', error);
    }
    
    // Combine critical and annotated documents
    const documentsToLoad = [...new Set([...criticalDocuments, ...Array.from(annotatedDocuments)])];
    console.log('🚀 Documents to preload:', documentsToLoad);
    
    // Load elements in parallel with proper error handling
    const loadPromises = documentsToLoad.map(async (docId) => {
      if (elementsLoadingStatus.loaded.has(docId) || elementsLoadingStatus.loading.has(docId)) {
        console.log('🚀 Skipping document', docId, '(already loaded/loading)');
        return;
      }
      
      try {
        setElementsLoadingStatus(prev => ({
          ...prev,
          loading: new Set([...prev.loading, docId])
        }));
        
        console.log('🚀 Loading elements for document', docId);
        await dispatch(fetchDocumentElements(docId)).unwrap();
        
        setElementsLoadingStatus(prev => ({
          loaded: new Set([...prev.loaded, docId]),
          loading: new Set([...prev.loading].filter(id => id !== docId)),
          failed: prev.failed
        }));
        
        console.log('🚀 ✅ Successfully loaded elements for document', docId);
      } catch (error) {
        console.error('🚀 ❌ Failed to load elements for document', docId, ':', error);
        
        setElementsLoadingStatus(prev => ({
          ...prev,
          loading: new Set([...prev.loading].filter(id => id !== docId)),
          failed: new Set([...prev.failed, docId])
        }));
      }
    });
    
    await Promise.allSettled(loadPromises);
    console.log('🚀 ✅ Cross-document element preloading complete');
    
    // Debug final state
    console.log('🚀 Final loading status:', {
      loaded: Array.from(elementsLoadingStatus.loaded),
      loading: Array.from(elementsLoadingStatus.loading),
      failed: Array.from(elementsLoadingStatus.failed)
    });
  }, [dispatch, elementsLoadingStatus]);

  // Preload on mount and when viewed documents change
  useEffect(() => {
    preloadCriticalElements();
  }, [preloadCriticalElements]);

  // 🎯 ENHANCED: Comprehensive element collection matching DocumentViewerContainer pattern
  const allElements = useAppSelector((state: RootState) => {
    const elements: DocumentElement[] = [];
    const elementIds = new Set<number>();
    
    // Only log once per component mount, not on every render
    const shouldLog = elements.length === 0;
    
    if (shouldLog) {
      console.log('🔄 === COLLECTING ALL ELEMENTS (MENUCONTEXT) ===');
    }
    
    // Get elements for viewed documents first
    for (const doc of viewedDocuments) {
      const docElements = selectElementsByDocumentId(state, doc.id);
      if (docElements && docElements.length > 0) {
        docElements.forEach(element => {
          if (!elementIds.has(element.id)) {
            elements.push(element);
            elementIds.add(element.id);
          }
        });
        if (shouldLog) {
          console.log('🔄 Added', docElements.length, 'elements from viewed document', doc.id);
        }
      }
    }
    
    // 🎯 CRITICAL: Get elements from ALL loaded documents (same as DocumentViewerContainer)
    try {
      const linkingAnns = linkingAnnotations.selectors.selectAllAnnotations(state);
      const referencedDocumentIds = new Set<number>();
      
      // Extract all document IDs from annotations
      linkingAnns.forEach(annotation => {
        if (annotation.document_id) {
          referencedDocumentIds.add(annotation.document_id);
        }
      });
      
      // Add critical documents based on database analysis
      [1, 2, 21].forEach(id => referencedDocumentIds.add(id));
      
      // Get elements from all referenced documents
      referencedDocumentIds.forEach(docId => {
        const docElements = selectElementsByDocumentId(state, docId);
        if (docElements && docElements.length > 0) {
          docElements.forEach(element => {
            if (!elementIds.has(element.id)) {
              elements.push(element);
              elementIds.add(element.id);
            }
          });
        }
      });
      
      if (shouldLog) {
        console.log('🔄 Total elements collected from', referencedDocumentIds.size, 'documents:', elements.length);
      }
      
    } catch (error) {
      console.warn('🔄 Error accessing document elements state:', error);
    }
    
    if (shouldLog) {
      console.log('🔄 Total unique elements collected:', elements.length);
      
      // Validate critical elements
      const criticalElements = elements.filter(el => [33, 34, 523, 524, 525, 526].includes(el.id));
      console.log('🔄 Critical elements available:', criticalElements.map(el => ({ 
        id: el.id, 
        docId: el.document_id 
      })));
      
      if (criticalElements.length === 0) {
        console.warn('🔄 ⚠️ NO CRITICAL ELEMENTS FOUND - Cross-document navigation may fail!');
      } else {
        console.log('🔄 ✅ Critical elements available for cross-document navigation');
      }
    }
    
    return elements;
  });

  // Get linking annotations with error handling (reduced logging)
  const allLinkingAnnotations = useAppSelector((state: RootState) => {
    try {
      const annotations = linkingAnnotations.selectors.selectAllAnnotations(state);
      // Only log once when annotations are first loaded
      if (annotations.length > 0) {
        console.log('🔗 Available linking annotations:', annotations.length);
      }
      return annotations;
    } catch (error) {
      console.warn('🔗 Error accessing linking annotations:', error);
      return [];
    }
  });

  // 🎯 ENHANCED: Smart selection creation with better element detection
  const createSelectionFromClickContext = useCallback((clickedElement: HTMLElement): LinkedTextSelection | null => {
    console.log('🔧 === CREATING SELECTION FROM CLICK CONTEXT ===');
    
    // Try existing text selection first
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && selection.toString().trim().length > 0) {
      const selectionData = createSelectionFromDOMSelection(selection, viewedDocuments);
      if (selectionData) {
        console.log('🔧 ✅ Created from text selection:', selectionData);
        return selectionData;
      }
    }
    
    // Find document context
    const documentPanel = clickedElement.closest('[data-document-id]') as HTMLElement;
    if (!documentPanel) {
      console.log('🔧 ❌ No document panel found');
      return null;
    }
    
    const documentId = parseInt(documentPanel.getAttribute('data-document-id') || '0');
    const foundDocument = viewedDocuments.find(d => d.id === documentId);
    
    if (!foundDocument) {
      console.log('🔧 ❌ Document not found in viewed documents:', documentId);
      return null;
    }
    
    // Find element container with multiple strategies
    let elementContainer: HTMLElement | null = clickedElement;
    let elementId: number | null = null;
    
    // Strategy 1: Look for direct element ID
    while (elementContainer && !elementId) {
      if (elementContainer.id?.includes('DocumentElements')) {
        const match = elementContainer.id.match(/DocumentElements\/(\d+)/);
        if (match) {
          elementId = parseInt(match[1]);
          break;
        }
      }
      elementContainer = elementContainer.parentElement;
    }
    
    // Strategy 2: Look for data attributes
    if (!elementId) {
      elementContainer = clickedElement;
      while (elementContainer) {
        const dataElementId = elementContainer.getAttribute('data-element-id');
        if (dataElementId) {
          elementId = parseInt(dataElementId);
          break;
        }
        elementContainer = elementContainer.parentElement;
      }
    }
    
    // Strategy 3: Look for any numeric ID that might be an element
    if (!elementId) {
      elementContainer = clickedElement;
      while (elementContainer) {
        if (elementContainer.id && /^\d+$/.test(elementContainer.id)) {
          const potentialId = parseInt(elementContainer.id);
          // Verify this element exists in our elements
          if (allElements.some(el => el.id === potentialId && el.document_id === documentId)) {
            elementId = potentialId;
            break;
          }
        }
        elementContainer = elementContainer.parentElement;
      }
    }
    
    if (!elementId) {
      console.log('🔧 ❌ Could not determine element ID from clicked context');
      return null;
    }
    
    // Verify element exists
    const element = allElements.find(el => el.id === elementId && el.document_id === documentId);
    if (!element) {
      console.log('🔧 ❌ Element not found in loaded elements:', elementId);
      return null;
    }
    
    const syntheticSelection: LinkedTextSelection = {
      documentId: foundDocument.id,
      documentElementId: elementId,
      text: clickedElement.textContent?.substring(0, 100) || 'clicked text',
      start: 0,
      end: Math.min(50, clickedElement.textContent?.length || 50),
      sourceURI: `/DocumentElements/${elementId}`
    };
    
    console.log('🔧 ✅ Created synthetic selection:', syntheticSelection);
    return syntheticSelection;
  }, [viewedDocuments, allElements]);

  // 🎯 ENHANCED: Robust linked document discovery
  const findLinkedDocuments = useCallback((selection: LinkedTextSelection): HierarchicalLinkedDocuments => {
    console.log('🔍 === ENHANCED LINKED DOCUMENT DISCOVERY ===');
    console.log('🔍 Selection context:', {
      documentId: selection.documentId,
      elementId: selection.documentElementId,
      sourceURI: selection.sourceURI,
      text: selection.text.substring(0, 50) + '...'
    });
    
    console.log('🔍 Available resources:');
    console.log('🔍   Elements:', allElements.length);
    console.log('🔍   Documents:', allDocuments.length);
    console.log('🔍   Annotations:', allLinkingAnnotations.length);
    console.log('🔍   Viewed documents:', viewedDocuments.length);
    
    // Enhanced validation
    const criticalElements = allElements.filter(el => [33, 34, 523, 524, 525, 526].includes(el.id));
    if (criticalElements.length === 0) {
      console.warn('🔍 ⚠️ CRITICAL: No cross-document elements found!');
      console.warn('🔍 This will prevent cross-document navigation.');
      console.warn('🔍 Expected elements: 33, 34 (doc 2), 523, 524, 525, 526 (doc 21)');
    } else {
      console.log('🔍 ✅ Critical elements available:', criticalElements.map(el => ({ 
        id: el.id, 
        docId: el.document_id 
      })));
    }
    
    try {
      const result = getLinkedDocumentsSimple(
        selection,
        allLinkingAnnotations,
        allDocuments,
        viewedDocuments,
        allElements
      );
      
      console.log('🔍 Discovery result:', Object.keys(result).length, 'linked documents found');
      
      Object.entries(result).forEach(([docIdStr, doc]) => {
        console.log(`🔍 Document ${docIdStr} (${doc.documentTitle}):`, {
          isCurrentlyOpen: doc.isCurrentlyOpen,
          linkedTextOptions: doc.linkedTextOptions.length,
          firstOptionText: doc.linkedTextOptions[0]?.linkedText.substring(0, 40) + '...',
          firstOptionURI: doc.linkedTextOptions[0]?.targetInfo.sourceURI
        });
      });
      
      return result;
    } catch (error) {
      console.error('🔍 ❌ Error in linked document discovery:', error);
      return {};
    }
  }, [allElements, allDocuments, allLinkingAnnotations, viewedDocuments]);

  // 🎯 ENHANCED: Context menu event handler with comprehensive click detection
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      console.log('🖱️ === RIGHT-CLICK EVENT DETECTED ===');
      console.log('🖱️ Event details:', {
        clientX: e.clientX,
        clientY: e.clientY,
        target: e.target,
        targetTagName: (e.target as HTMLElement)?.tagName,
        targetId: (e.target as HTMLElement)?.id,
        targetClassName: (e.target as HTMLElement)?.className
      });
      
      const clickedElement = e.target as HTMLElement;
      
      // More aggressive document panel detection
      let documentPanel = clickedElement.closest('[data-document-id]') as HTMLElement;
      
      // If still not found, try alternative selectors
      if (!documentPanel) {
        documentPanel = clickedElement.closest('.document-content-panel') as HTMLElement;
      }
      
      if (!documentPanel) {
        console.log('🖱️ ❌ No document panel found for clicked element');
        console.log('🖱️ Element hierarchy:', {
          element: clickedElement,
          parent: clickedElement.parentElement,
          grandparent: clickedElement.parentElement?.parentElement
        });
        return;
      }
      
      const documentId = parseInt(documentPanel.getAttribute('data-document-id') || '0');
      console.log('🖱️ ✅ Found document panel for document:', documentId);
      
      const isValidDocument = viewedDocuments.some(d => d.id === documentId);
      
      if (!isValidDocument) {
        console.log('🖱️ ❌ Invalid document context:', documentId);
        console.log('🖱️ Available viewed documents:', viewedDocuments.map(d => d.id));
        return;
      }
      
      console.log('🖱️ ✅ Valid document context confirmed:', documentId);
      
      // Create selection from click context
      const selection = createSelectionFromClickContext(clickedElement);
      if (!selection) {
        console.log('🖱️ ❌ Could not create selection from click context');
        return;
      }
      
      console.log('🖱️ ✅ Selection created:', selection);
      
      // Prevent default and calculate position
      e.preventDefault();
      e.stopPropagation();
      
      const position = {
        x: Math.min(e.clientX, window.innerWidth - 250),
        y: Math.min(e.clientY, window.innerHeight - 200)
      };
      
      console.log('🖱️ Menu position calculated:', position);
      
      // Find linked documents
      console.log('🖱️ Finding linked documents...');
      const hierarchicalDocuments = findLinkedDocuments(selection);
      console.log('🖱️ Found linked documents:', Object.keys(hierarchicalDocuments).length);
      
      // Update menu state
      setMenuState({
        isVisible: true,
        position,
        selection,
        hierarchicalDocuments,
        showHierarchicalMenu: false
      });
      
      console.log('🖱️ ✅ Context menu activated with', Object.keys(hierarchicalDocuments).length, 'linked documents');
    };

    const handleClick = (e: MouseEvent) => {
      const target = e.target as Element;
      
      // Check if click is outside all menu elements
      const isOutsideMenus = !target.closest('.context-menu') && 
                            !target.closest('.hierarchical-linked-text-menu') && 
                            !target.closest('.linked-text-options-submenu');
      
      if (isOutsideMenus) {
        setMenuState(prev => ({
          ...prev,
          isVisible: false,
          showHierarchicalMenu: false
        }));
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuState(prev => ({
          ...prev,
          isVisible: false,
          showHierarchicalMenu: false
        }));
      }
    };

    console.log('🖱️ === SETTING UP CONTEXT MENU EVENT LISTENERS ===');
    console.log('🖱️ Adding contextmenu listener to document');

    // Add event listeners with more aggressive capture
    document.addEventListener("contextmenu", handleContextMenu, { 
      capture: true, 
      passive: false 
    });
    document.addEventListener("click", handleClick, { capture: true });
    document.addEventListener("keydown", handleEscape);
    
    console.log('🖱️ ✅ Context menu event listeners added');

    return () => {
      console.log('🖱️ Removing context menu event listeners');
      document.removeEventListener("contextmenu", handleContextMenu, { capture: true });
      document.removeEventListener("click", handleClick, { capture: true });
      document.removeEventListener("keydown", handleEscape);
    };
  }, [viewedDocuments, createSelectionFromClickContext, findLinkedDocuments]);

  // Close menus when annotation creation starts
  useEffect(() => {
    if (annotationCreate?.motivation && menuState.isVisible) {
      setMenuState(prev => ({
        ...prev,
        isVisible: false,
        showHierarchicalMenu: false
      }));
    }
  }, [annotationCreate, menuState.isVisible]);

  // 🎯 ENHANCED: Linked text selection handler with comprehensive error handling
  const handleLinkedTextSelection = useCallback((
    documentId: number,
    collectionId: number,
    option: LinkedTextOption,
    isCurrentlyOpen: boolean
  ) => {
    // CRITICAL DEBUG: Log to both console AND browser alert to bypass console crash
    const debugInfo = {
      documentId: documentId,
      collectionId: collectionId,
      isCurrentlyOpen: isCurrentlyOpen,
      targetURI: option.targetInfo.sourceURI,
      allTargetsCount: option.allTargets?.length || 0,
      allTargetsURIs: option.allTargets?.map(t => t.sourceURI) || []
    };
    
    console.log('🎯 === MENUCONTEXT: LINKED TEXT SELECTION HANDLER ===');
    console.log('🎯 CRITICAL DEBUG INFO:', debugInfo);
    
    // Also show an alert so we can see the data even if console crashes
    if (process.env.NODE_ENV === 'development') {
      alert(`Navigation Debug:
Source Doc: ${documentId}
Collection: ${collectionId}
Target URI: ${option.targetInfo.sourceURI}
All Targets: ${option.allTargets?.length || 0}
Target URIs: ${option.allTargets?.map(t => t.sourceURI).join(', ')}`);
    }
    
    // Close menus immediately
    setMenuState(prev => ({
      ...prev,
      isVisible: false,
      showHierarchicalMenu: false
    }));
    
    if (!onOpenLinkedDocument) {
      console.error('🎯 ❌ onOpenLinkedDocument callback not provided');
      return;
    }
    
    console.log('🎯 🚀 CALLING onOpenLinkedDocument...');
    
    try {
      // Use setTimeout to ensure clean state transition
      setTimeout(() => {
        onOpenLinkedDocument(
          menuState.selection?.documentId || documentId,           // Source document (where user clicked FROM)
          collectionId,         // Collection ID
          option.targetInfo,    // Target element info
          option.allTargets     // All related targets for cross-document navigation
        );
        console.log('🎯 ✅ Navigation callback executed successfully from MenuContext');
      }, 50);
    } catch (error) {
      console.error('🎯 ❌ Error executing navigation callback:', error);
    }
  }, [onOpenLinkedDocument]);

  // Handle view linked text button
  const handleViewLinkedText = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('🔗 === VIEW LINKED TEXT BUTTON CLICKED ===');
    
    const linkedDocumentIds = Object.keys(menuState.hierarchicalDocuments).map(Number);
    console.log('🔗 Available linked documents:', linkedDocumentIds);
    
    // Direct selection for single document with single option
    if (linkedDocumentIds.length === 1) {
      const singleDoc = menuState.hierarchicalDocuments[linkedDocumentIds[0]];
      if (singleDoc.linkedTextOptions.length === 1) {
        console.log('🔗 Direct selection (single document, single option)');
        handleLinkedTextSelection(
          singleDoc.documentId,
          singleDoc.collectionId,
          singleDoc.linkedTextOptions[0],
          singleDoc.isCurrentlyOpen
        );
        return;
      }
    }
    
    // Show hierarchical menu for multiple options
    console.log('🔗 Showing hierarchical menu for multiple options');
    setMenuState(prev => ({
      ...prev,
      showHierarchicalMenu: true
    }));
  }, [menuState.hierarchicalDocuments, handleLinkedTextSelection]);

  // Calculate hierarchical menu position
  const calculateHierarchicalMenuPosition = useCallback(() => {
    const mainMenuWidth = 200;
    const hierarchicalMenuWidth = 320;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    let menuX = menuState.position.x + mainMenuWidth + 5;
    let menuY = menuState.position.y;
    
    // Boundary checking
    if (menuX + hierarchicalMenuWidth > windowWidth - 10) {
      menuX = menuState.position.x - hierarchicalMenuWidth - 5;
    }
    
    if (menuX < 10) {
      menuX = 10;
    }
    
    if (menuY < 10) {
      menuY = 10;
    }
    
    const estimatedMenuHeight = Math.min(400, Object.keys(menuState.hierarchicalDocuments).length * 60 + 100);
    if (menuY + estimatedMenuHeight > windowHeight - 10) {
      menuY = Math.max(10, windowHeight - estimatedMenuHeight - 10);
    }
    
    return { x: menuX, y: menuY };
  }, [menuState.position, menuState.hierarchicalDocuments]);

  // Render logic
  const hasLinkedDocuments = Object.keys(menuState.hierarchicalDocuments).length > 0;
  const totalLinkedDocuments = Object.keys(menuState.hierarchicalDocuments).length;
  
  if (!menuState.isVisible && !menuState.showHierarchicalMenu) {
    return null;
  }

  return (
    <>
      {/* Main context menu */}
      {menuState.isVisible && (text || menuState.selection) && createPortal(
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
          
          {hasLinkedDocuments && (
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
          
          {/* Enhanced debug info */}
          {process.env.NODE_ENV === 'development' && (
            <div style={{
              borderTop: '1px solid #eee',
              padding: '4px 8px',
              fontSize: '10px',
              color: '#666',
              fontFamily: 'monospace'
            }}>
              <div>Selection={menuState.selection ? '✓' : '✗'}, Links={totalLinkedDocuments}</div>
              <div>Elements={allElements.length}, Critical={allElements.filter(el => [33, 34, 523, 524].includes(el.id)).length}</div>
              <div>Annotations={allLinkingAnnotations.length}, Docs={allDocuments.length}</div>
              <div>Loaded={Array.from(elementsLoadingStatus.loaded).join(',')}</div>
            </div>
          )}
        </ContextMenu>,
        document.body
      )}

      {/* Hierarchical linked text menu */}
      {hasLinkedDocuments && menuState.showHierarchicalMenu && createPortal(
        <HierarchicalLinkedTextMenu
          hierarchicalDocuments={menuState.hierarchicalDocuments}
          onLinkedTextSelect={handleLinkedTextSelection}
          onClose={() => setMenuState(prev => ({ ...prev, showHierarchicalMenu: false }))}
          position={calculateHierarchicalMenuPosition()}
        />,
        document.body
      )}
    </>
  );
};

export default MenuContext;