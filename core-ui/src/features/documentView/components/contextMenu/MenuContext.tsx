// src/features/documentView/components/contextMenu/MenuContext.tsx

import React, { useState, useEffect } from "react";
import { ContextMenu, ContextButton } from "./ContextMenuComponents";
import { 
  useAppDispatch, 
  useAppSelector, 
  selectSegments, 
  setMotivation, 
  selectAnnotationCreate,
  linkingAnnotations
} from "@store";
import { createPortal } from 'react-dom';
import { useAuth } from "@hooks/useAuthContext";
import { 
  createSelectionFromDOMSelection, 
  LinkedDocument,
  LinkedTextSelection
} from '@documentView/utils/linkedTextUtils';
import { RootState } from '@store';

interface MenuContextProps {
  // Documents currently being viewed in the comparison container
  viewedDocuments?: Array<{
    id: number;
    collectionId: number;
    title: string;
  }>;
  // Callback to open a document in comparison view
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

// Import the actual Annotation type from your types
import { Annotation } from '@documentView/types';

const MenuContext: React.FC<MenuContextProps> = ({
  viewedDocuments = [],
  onOpenLinkedDocument
}) => {
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const text = useAppSelector(selectSegments);
  const annotationCreate = useAppSelector(selectAnnotationCreate);
  
  // Get all linking annotations using a memoized selector to prevent unnecessary rerenders
  const allLinkingAnnotations = useAppSelector(
    React.useCallback((state: RootState) => {
      try {
        // Check if linking annotations are in the store
        if (state.annotations?.linking) {
          // Use the selectAllAnnotations selector from the linking slice
          return linkingAnnotations.selectors.selectAllAnnotations(state);
        }
        console.warn('Linking annotations not found in store. Make sure linkingAnnotations is added to annotationReducersMap in store/index.ts');
        return [];
      } catch (error) {
        console.warn('Error accessing linking annotations:', error);
        return [];
      }
    }, []),
    (prev, curr) => {
      // Custom equality check to prevent unnecessary rerenders
      if (prev.length !== curr.length) return false;
      return prev.every((item, index) => item.id === curr[index]?.id);
    }
  );
  
  const [clicked, setClicked] = useState(false);
  const [showLinkedSubmenu, setShowLinkedSubmenu] = useState(false);
  const [currentSelection, setCurrentSelection] = useState<LinkedTextSelection | null>(null);
  const [linkedDocuments, setLinkedDocuments] = useState<LinkedDocument[]>([]);
  
  const [coords, setCoords] = useState<{ x: number; y: number }>({
    x: 0, y: 0
  });
  
  // Calculate submenu position to the right of main menu
  const calculateSubmenuPosition = (mainMenuX: number, mainMenuY: number) => {
    const mainMenuWidth = 200; // Approximate width of main context menu
    const submenuWidth = 280; // Approximate width of submenu
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    let submenuX = mainMenuX + mainMenuWidth; // 5px gap to the right
    let submenuY = mainMenuY - 25; // Start 10px higher to align better with main menu
    
    // Check if submenu would go off right edge of screen
    if (submenuX + submenuWidth > windowWidth) {
      // Position to the left instead
      submenuX = mainMenuX - submenuWidth - 5;
    }
    
    // Check if submenu would go off top edge
    if (submenuY < 10) {
      submenuY = 10; // Minimum distance from top
    }
    
    // Check if submenu would go off bottom edge
    const estimatedSubmenuHeight = Math.min(300, linkedDocuments.length * 80 + 50); // +50 for header
    if (submenuY + estimatedSubmenuHeight > windowHeight) {
      // Adjust to fit within window
      submenuY = Math.max(10, windowHeight - estimatedSubmenuHeight - 10);
    }
    
    return { x: submenuX, y: submenuY };
  };

  // FIXED VERSION - Better document title resolution
  const findLinkedDocuments = React.useCallback((selection: LinkedTextSelection): LinkedDocument[] => {
    if (!selection) return [];
    
    const linkedDocs: LinkedDocument[] = [];
    
    console.log('findLinkedDocuments called with:', {
      selection: {
        documentId: selection.documentId,
        sourceURI: selection.sourceURI,
        text: selection.text.substring(0, 50) + '...'
      },
      viewedDocuments: viewedDocuments.map(d => ({ id: d.id, title: d.title }))
    });
    
    // Filter linking annotations that contain our selection
    const relevantAnnotations = allLinkingAnnotations.filter((annotation: Annotation) => {
      if (!annotation.target || !Array.isArray(annotation.target)) {
        return false;
      }
      
      return annotation.target.some((target) => {
        const targetSourceURI = target.source;
        const selectionSourceURI = selection.sourceURI;
        
        if (targetSourceURI !== selectionSourceURI) {
          return false;
        }
        
        // Check if the text ranges overlap
        const targetStart = target.selector?.refined_by?.start;
        const targetEnd = target.selector?.refined_by?.end;
        
        if (targetStart === undefined || targetEnd === undefined) {
          return false;
        }
        
        // Check for overlap between selection and target
        return !(selection.end <= targetStart || selection.start >= targetEnd);
      });
    });
    
    console.log('Found relevant annotations:', relevantAnnotations.length);
    
    // Extract linked documents from relevant annotations
    relevantAnnotations.forEach((annotation: Annotation) => {
      console.log('Processing annotation:', {
        id: annotation.id,
        document_id: annotation.document_id,
        targets: annotation.target?.map(t => t.source) || []
      });
      
      // COLLECT ALL TARGETS from this annotation for proper highlighting
      const allTargets = annotation.target.map(target => ({
        sourceURI: target.source,
        start: target.selector?.refined_by?.start || 0,
        end: target.selector?.refined_by?.end || 0,
        text: target.selector?.value || 'Linked text'
      }));
      
      // Find targets from OTHER documents for navigation
      const otherDocumentTargets = annotation.target.filter(target => 
        target.source !== selection.sourceURI
      );
      
      console.log('Other document targets:', otherDocumentTargets.length);
      
      otherDocumentTargets.forEach((target) => {
        const targetSourceURI = target.source;
        
        // Extract document element ID from sourceURI
        const targetElementMatch = targetSourceURI.match(/\/DocumentElements\/(\d+)/);
        if (!targetElementMatch) return;
        
        // FIXED: Better document title resolution
        let targetDocumentId: number | null = null;
        let targetDocumentTitle = 'Unknown Document';
        let targetCollectionId: number | null = null;
        
        // Method 1: Use annotation's document_id if it's different from current selection
        if (annotation.document_id && annotation.document_id !== selection.documentId) {
          targetDocumentId = annotation.document_id;
          
          // FIXED: Look up the document title from viewedDocuments
          const documentInfo = viewedDocuments.find(doc => doc.id === targetDocumentId);
          if (documentInfo) {
            targetDocumentTitle = documentInfo.title;
            targetCollectionId = documentInfo.collectionId;
            console.log('Found document via annotation.document_id:', {
              id: targetDocumentId,
              title: targetDocumentTitle
            });
          } else {
            console.log('Document not found in viewedDocuments for annotation.document_id:', targetDocumentId);
          }
        }
        
        // Method 2: For multi-document views, find the other document (fallback)
        if (!targetDocumentId && viewedDocuments.length > 1) {
          const otherDoc = viewedDocuments.find(doc => doc.id !== selection.documentId);
          if (otherDoc) {
            targetDocumentId = otherDoc.id;
            targetDocumentTitle = otherDoc.title;
            targetCollectionId = otherDoc.collectionId;
            console.log('Found document via fallback method:', {
              id: targetDocumentId,
              title: targetDocumentTitle
            });
          }
        }
        
        // Method 3: If still no document found, try to infer from available documents
        if (!targetDocumentId && viewedDocuments.length > 0) {
          // This is a last resort - might not be accurate but better than nothing
          const firstAvailable = viewedDocuments.find(doc => doc.id !== selection.documentId);
          if (firstAvailable) {
            targetDocumentId = firstAvailable.id;
            targetDocumentTitle = firstAvailable.title + ' (inferred)';
            targetCollectionId = firstAvailable.collectionId;
            console.log('Found document via inference:', {
              id: targetDocumentId,
              title: targetDocumentTitle
            });
          }
        }
        
        if (targetDocumentId) {
          // Extract text from the target selector
          const linkedText = target.selector?.value || annotation.body.value || 'Linked text';
          
          console.log('Creating linked document:', {
            documentId: targetDocumentId,
            documentTitle: targetDocumentTitle,
            linkedText: linkedText.substring(0, 50) + '...'
          });
          
          linkedDocs.push({
            documentId: targetDocumentId,
            documentTitle: targetDocumentTitle,
            linkedText: linkedText,
            linkingAnnotationId: annotation.id,
            targetInfo: {
              sourceURI: targetSourceURI,
              start: target.selector?.refined_by?.start || 0,
              end: target.selector?.refined_by?.end || 0,
            },
            collectionId: targetCollectionId || 0,
            // CRUCIAL: Include ALL targets for proper multi-element highlighting
            allTargets: allTargets
          });
        } else {
          console.log('Could not determine target document ID for target:', targetSourceURI);
        }
      });
    });
    
    // Remove duplicates based on document ID and annotation ID
    const uniqueLinkedDocs = linkedDocs.reduce((acc, current) => {
      const existing = acc.find(item => 
        item.documentId === current.documentId && 
        item.linkingAnnotationId === current.linkingAnnotationId
      );
      if (!existing) {
        acc.push(current);
      }
      return acc;
    }, [] as LinkedDocument[]);
    
    console.log('Final unique linked documents:', uniqueLinkedDocs.map(doc => ({
      id: doc.documentId,
      title: doc.documentTitle
    })));
    
    return uniqueLinkedDocs;
  }, [allLinkingAnnotations, viewedDocuments]);

  useEffect(() => {
    if (annotationCreate && annotationCreate.motivation && clicked) {
      setClicked(false);
      setShowLinkedSubmenu(false);
    }
  }, [annotationCreate, clicked]);

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      if (text && text.length > 0) {
        e.preventDefault();
        
        // Get current DOM selection to check for linked text
        const selection = window.getSelection();
        
        if (selection) {
          const selectionInfo = createSelectionFromDOMSelection(selection, viewedDocuments);
          setCurrentSelection(selectionInfo);
          
          if (selectionInfo) {
            const linkedDocs = findLinkedDocuments(selectionInfo);
            setLinkedDocuments(linkedDocs);
          } else {
            setLinkedDocuments([]);
          }
        }
        
        setCoords({ x: e.pageX, y: e.pageY});
        setClicked(true);
        setShowLinkedSubmenu(false);
      }
    };

    const handleClick = (e: MouseEvent) => {
      const target = e.target as Element;
      const contextMenu = document.querySelector('.context-menu');
      const submenu = document.querySelector('.linked-text-submenu');
      
      if (!contextMenu?.contains(target) && !submenu?.contains(target)) {
        setClicked(false);
        setShowLinkedSubmenu(false);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setClicked(false);
        setShowLinkedSubmenu(false);
      }
    };

    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("click", handleClick);
    document.addEventListener("keydown", handleEscape);
    
    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("click", handleClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [text, findLinkedDocuments, viewedDocuments]);

  const handleViewLinkedText = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (linkedDocuments.length === 1) {
      // Single linked document - open directly
      handleLinkedDocumentSelect(linkedDocuments[0]);
    } else if (linkedDocuments.length > 1) {
      // Multiple linked documents - show submenu
      setShowLinkedSubmenu(true);
    }
  };

  const handleLinkedDocumentSelect = (linkedDoc: LinkedDocument) => {
    console.log('Opening linked document with allTargets:', {
      documentId: linkedDoc.documentId,
      linkedText: linkedDoc.linkedText,
      targetInfo: linkedDoc.targetInfo,
      allTargets: linkedDoc.allTargets?.length || 0
    });
    
    if (onOpenLinkedDocument) {
      // CRUCIAL: Pass allTargets for proper multi-element highlighting
      onOpenLinkedDocument(
        linkedDoc.documentId, 
        linkedDoc.collectionId || 0, 
        linkedDoc.targetInfo,
        linkedDoc.allTargets // This enables multi-element highlighting and recovery
      );
    }
    setShowLinkedSubmenu(false);
    setClicked(false);
  };

  // Check if current selection has linked text
  const selectionHasLinks = currentSelection && linkedDocuments.length > 0;

  if (!clicked && !showLinkedSubmenu) {
    return null;
  }

  return (
    <>
      {clicked && text && createPortal(
        <ContextMenu top={coords.y} left={coords.x}>
          {/* EXISTING OPTIONS */}
          <ContextButton 
            key={`context-button-${1}`} 
            onClick={(e: React.MouseEvent) => {
              e.preventDefault();
              e.stopPropagation();
              dispatch(setMotivation("commenting"));
            }}
          >
            {"Create Comment"}
          </ContextButton>
          
          {(user?.roles?.includes('admin') || user?.roles?.includes('verified_scholar')) && (
            <ContextButton 
              key={`context-button-${2}`} 
              onClick={(e: React.MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();
                dispatch(setMotivation("scholarly"));
              }}
            >
              {"Create Scholarly Annotation"}
            </ContextButton>
          )}
          
          {/* LINKED TEXT OPTION */}
          {selectionHasLinks && (
            <ContextButton 
              key={`context-button-linked`} 
              onClick={handleViewLinkedText}
              style={{
                borderTop: '1px solid #eee',
                fontWeight: '500',
                color: '#1976d2',
                position: 'relative'
              }}
            >
              View Linked Text ({linkedDocuments.length})
              {linkedDocuments.length > 1 && (
                <span style={{ 
                  marginLeft: '8px', 
                  fontSize: '12px',
                  color: '#666' 
                }}>
                  ▶
                </span>
              )}
            </ContextButton>
          )}
        </ContextMenu>,
        document.body
      )}

      {/* SIDE-BY-SIDE SUBMENU for multiple linked documents */}
      {selectionHasLinks && showLinkedSubmenu && linkedDocuments.length > 1 && createPortal(
        <div
          className="linked-text-submenu"
          style={{
            position: 'fixed',
            top: `${calculateSubmenuPosition(coords.x, coords.y).y}px`,
            left: `${calculateSubmenuPosition(coords.x, coords.y).x}px`,
            zIndex: 10002, // Higher than main menu
            backgroundColor: 'white',
            border: '1px solid #ccc',
            borderRadius: '4px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            minWidth: '250px',
            maxWidth: '300px',
            maxHeight: '300px',
            overflowY: 'auto',
            fontFamily: 'inherit'
          }}
          onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
        >
          {/* Submenu header */}
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
            Select Linked Document ({linkedDocuments.length})
          </div>
          
          {linkedDocuments.map((linkedDoc, index) => (
            <button
              key={`linked-doc-${linkedDoc.documentId}-${index}`}
              onClick={() => handleLinkedDocumentSelect(linkedDoc)}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '10px 12px',
                border: 'none',
                borderBottom: index < linkedDocuments.length - 1 ? '1px solid #f0f0f0' : 'none',
                borderRadius: '0',
                fontSize: '13px',
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
              <div style={{ fontWeight: '500', color: '#333', marginBottom: '4px' }}>
                📄 {linkedDoc.documentTitle}
              </div>
              <div style={{
                fontSize: '11px',
                color: '#666',
                fontStyle: 'italic',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                "{linkedDoc.linkedText.length > 50 
                  ? linkedDoc.linkedText.substring(0, 50) + '...' 
                  : linkedDoc.linkedText}"
              </div>
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  );
};

export default MenuContext;