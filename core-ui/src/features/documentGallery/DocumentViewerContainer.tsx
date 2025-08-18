// src/features/documentGallery/DocumentViewerContainer.tsx
// CLEAN VERSION - Only critical debug logs for highlighting investigation

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "@store/hooks";
import { 
  setSelectedCollectionId as setReduxSelectedCollectionId, 
  fetchDocumentsByCollection,
  fetchDocumentCollections,
  fetchAllDocuments,
  selectAllDocuments,
  selectAllDocumentCollections,
  linkingAnnotations,
  selectElementsByDocumentId,
  fetchDocumentElements
} from "@store";

import { 
  startNavigationSession,
  addNavigationHighlight,
  clearNavigationSession
} from "@store/slice/navigationHighlightSlice";

import { RootState } from '@store';
import DocumentCollectionGallery from "@documentGallery/DocumentCollectionGallery";
import DocumentGallery from "@documentGallery/components/DocumentGallery";
import { DocumentComparisonContainer } from "@documentView";
import DocumentLinkingOverlay from '@/features/documentView/components/annotationCard/DocumentLinkingOverlay';
import { scrollToAndHighlightText } from '@/features/documentView/utils/scrollToTextUtils';
import RouterSwitchBoard from "@/RouterSwitchBoard";
import "./styles/DocumentViewerStyles.css";

// Main container component that routes to RouterSwitchBoard
const DocumentViewerContainer: React.FC = () => {  
  return <RouterSwitchBoard />;
};

// Collections view component
export const CollectionsView: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  
  useEffect(() => {
    dispatch(fetchDocumentCollections());
  }, [dispatch]);
  
  const handleCollectionSelect = (collectionId: number) => {
    navigate(`/collections/${collectionId}`);
  };
  
  return <DocumentCollectionGallery onCollectionSelect={handleCollectionSelect} />;
};

// Documents gallery view component
export const DocumentsView: React.FC = () => {
  const { collectionId } = useParams<{ collectionId: string }>();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (collectionId) {
      dispatch(setReduxSelectedCollectionId(Number(collectionId)));
      dispatch(fetchDocumentsByCollection(Number(collectionId)));
    }
  }, [collectionId, dispatch]);
  
  const handleDocumentSelect = (documentId: number) => {
    navigate(`/collections/${collectionId}/documents/${documentId}`);
  };
  
  const handleBackToCollections = () => {
    navigate('/');
  };
  
  return (
    <DocumentGallery
      collectionId={collectionId ? Number(collectionId) : null}
      onDocumentSelect={handleDocumentSelect}
      onBackToCollections={handleBackToCollections}
    />
  );
};

// Document element type
interface DocumentElement {
  id: number;
  document_id: number;
  content?: unknown;
}

// Main document content view component with cross-document element loading
export const DocumentContentView: React.FC = () => {
  const { collectionId, documentId } = useParams<{ collectionId: string; documentId: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  
  // Use useRef for atomic state updates
  const isUpdatingDocuments = useRef(false);

  // State to track the documents being viewed
  const [viewedDocuments, setViewedDocuments] = useState<Array<{
    id: number, 
    collectionId: number,
    title: string
  }>>([]);

  // Properly typed elements selector
  const allElements = useAppSelector((state: RootState) => {
    const elements: DocumentElement[] = [];
    
    // Get elements for all viewed documents
    for (const doc of viewedDocuments) {
      const docElements = selectElementsByDocumentId(state, doc.id);
      if (docElements && docElements.length > 0) {
        elements.push(...docElements);
      }
    }
    
    // Get elements from critical cross-document navigation documents
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
      [2, 21].forEach(id => referencedDocumentIds.add(id));
      
      // Get elements from all referenced documents
      referencedDocumentIds.forEach(docId => {
        const docElements = selectElementsByDocumentId(state, docId);
        if (docElements && docElements.length > 0) {
          docElements.forEach(element => {
            if (!elements.find(el => el.id === element.id)) {
              elements.push(element);
            }
          });
        }
      });
      
    } catch (error) {
      console.error(error)
    }
    
    return elements;
  });
  
  // Track documents by collection to handle the API response structure
  const [documentsByCollection, setDocumentsByCollection] = useState<{
    [collectionId: number]: Array<{ id: number, title: string }>
  }>({});
  const [isLinkingModeActive, setIsLinkingModeActive] = useState(false);
  
  // Simplified pending scroll target state
  const [pendingScrollTarget, setPendingScrollTarget] = useState<{
    documentId: number;
    targetInfo: {
      sourceURI: string;
      start: number;
      end: number;
    };
    allTargets?: Array<{
      sourceURI: string;
      start: number;
      end: number;
      text: string;
    }>;
  } | null>(null);
  
  // Get all documents and collections
  const documents = useAppSelector(selectAllDocuments);
  const documentCollections = useAppSelector(selectAllDocumentCollections) as Array<{
    id: number;
    title: string;
    description?: string;
  }>;
  
  // Track loading state
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  
  // State for document selection dropdown
  const [selectedCollectionId, setSelectedCollectionId] = useState<number>(Number(collectionId));
  
  // State for management panel collapse
  const [isManagementPanelCollapsed, setIsManagementPanelCollapsed] = useState(true);
  
  // State for view mode (reading vs annotations)
  const [viewMode, setViewMode] = useState<'reading' | 'annotations'>('reading');
  
  // State for showing linked text highlights
  const [showLinkedTextHighlights, setShowLinkedTextHighlights] = useState(false);

  // State to track if we're in comparison mode
  const [comparisonDocumentId, setComparisonDocumentId] = useState<number | null>(null);

  // Collection loading effect
  useEffect(() => {
    if (selectedCollectionId && selectedCollectionId !== Number(collectionId) && 
        !documentsByCollection[selectedCollectionId]) {
      
      setIsLoadingDocuments(true);
      
      dispatch(fetchDocumentsByCollection(selectedCollectionId))
        .unwrap()
        .then((payload) => {
          setDocumentsByCollection(prev => ({
            ...prev,
            [selectedCollectionId]: payload.documents.map(doc => ({
              id: doc.id,
              title: doc.title
            }))
          }));
          setIsLoadingDocuments(false);
        })
        .catch(() => {
          setIsLoadingDocuments(false);
        });
    }
  }, [selectedCollectionId, collectionId, documentsByCollection, dispatch]);

  // Cross-document element loader
  const loadCrossDocumentElements = useCallback(async () => {
    try {
      const criticalDocuments = [2, 21];
      
      const loadPromises = criticalDocuments.map(async (docId) => {
        try {
          await dispatch(fetchDocumentElements(docId)).unwrap();
        } catch (error) {
          console.error(`Failed to load elements for document ${docId}:`, error);
        }
      });
      
      await Promise.all(loadPromises);
    } catch (error) {
      console.error('Error loading cross-document elements:', error);
    }
  }, [dispatch]);

  // Load all documents and cross-document elements
  useEffect(() => {
    dispatch(fetchAllDocuments())
      .unwrap()
      .then(() => {
        return loadCrossDocumentElements();
      })
  }, [dispatch, loadCrossDocumentElements]);
  
  // Fetch document collections when component mounts
  useEffect(() => {
    dispatch(fetchDocumentCollections());
  }, [dispatch]);
  
  // Fetch documents for the current collection
  useEffect(() => {
    if (collectionId) {
      setIsLoadingDocuments(true);
      
      dispatch(fetchDocumentsByCollection(Number(collectionId)))
        .unwrap()
        .then((payload) => {
          setDocumentsByCollection(prev => ({
            ...prev,
            [Number(collectionId)]: payload.documents.map(doc => ({
              id: doc.id,
              title: doc.title
            }))
          }));
          setIsLoadingDocuments(false);
        })
        .catch(() => {
          setIsLoadingDocuments(false);
        });
    }
  }, [collectionId, dispatch]);
  
  // Helper function to get document title
  const getDocumentTitle = useCallback((docId: number, docCollectionId: number): string => {
    // Method 1: Check documentsByCollection cache
    const docInCache = documentsByCollection[docCollectionId]?.find(d => d.id === docId);
    if (docInCache) {
      return docInCache.title;
    }
    
    // Method 2: Check Redux store
    const docInRedux = documents.find(d => d.id === docId);
    if (docInRedux) {
      return docInRedux.title;
    }
    
    // Fallback
    return `Document ${docId}`;
  }, [documentsByCollection, documents]);
  
  // Set up initial document view
  useEffect(() => {
    if (documentId && collectionId) {
      const docId = Number(documentId);
      const colId = Number(collectionId);
      
      let initialTitle = `Document ${docId}`;
      
      // Try to get from documentsByCollection cache
      const docInCache = documentsByCollection[colId]?.find(d => d.id === docId);
      if (docInCache) {
        initialTitle = docInCache.title;
      } else {
        // Try to get from Redux store
        const docInRedux = documents.find(d => d.id === docId);
        if (docInRedux) {
          initialTitle = docInRedux.title;
        }
      }
      
      setViewedDocuments([{
        id: docId,
        collectionId: colId,
        title: initialTitle
      }]);
      
      // Reset comparison state
      setComparisonDocumentId(null);
    }
  }, [documentId, collectionId, documentsByCollection, documents]);

  // Sync viewedDocuments with comparisonDocumentId
  useEffect(() => {
    if (viewedDocuments.length === 2) {
      const comparisonDoc = viewedDocuments[1];
      setComparisonDocumentId(comparisonDoc.id);
    } else if (viewedDocuments.length === 1) {
      setComparisonDocumentId(null);
    }
  }, [viewedDocuments]);
  
  // Handle scrolling with better timing and error handling
  useEffect(() => {
    if (pendingScrollTarget && viewedDocuments.some(doc => doc.id === pendingScrollTarget.documentId)) {
      const scrollTimeout = setTimeout(() => {
        try {
          const documentPanel = document.querySelector(`[data-document-id="${pendingScrollTarget.documentId}"]`);
          if (documentPanel) {
            scrollToAndHighlightText(pendingScrollTarget.targetInfo, pendingScrollTarget.allTargets);
            setPendingScrollTarget(null);
          } else {
            setTimeout(() => {
              scrollToAndHighlightText(pendingScrollTarget.targetInfo, pendingScrollTarget.allTargets);
              setPendingScrollTarget(null);
            }, 2000);
          }
        } catch (error) {
          setPendingScrollTarget(null);
          console.error('Error during scroll and highlight:', error);
        }
      }, 1500);
      
      return () => clearTimeout(scrollTimeout);
    }
  }, [pendingScrollTarget, viewedDocuments]);

  // Helper function for element-based document titles
  const getElementBasedDocumentTitle = useCallback((documentId: number): string | null => {
    const document = documents.find(doc => doc.id === documentId);
    if (document && document.title && !document.title.includes('Document ')) {
      return document.title;
    }
    
    for (const collectionId in documentsByCollection) {
      const doc = documentsByCollection[collectionId].find(d => d.id === documentId);
      if (doc && doc.title && !doc.title.includes('Document ')) {
        return doc.title;
      }
    }
    
    const viewedDoc = viewedDocuments.find(doc => doc.id === documentId);
    if (viewedDoc && viewedDoc.title && !viewedDoc.title.includes('Document ')) {
      return viewedDoc.title;
    }
    
    return null;
  }, [documents, documentsByCollection, viewedDocuments]);

  // Replace secondary document function
  const replaceSecondaryDocument = useCallback(async (
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
  ) => {
    if (isUpdatingDocuments.current) {
      return;
    }
    
    isUpdatingDocuments.current = true;
    
    try {
      let linkedDocTitle = getDocumentTitle(linkedDocumentId, linkedCollectionId);
      
      if (linkedDocTitle.includes('Document ') && !documentsByCollection[linkedCollectionId]) {
        setIsLoadingDocuments(true);
        
        try {
          const payload = await dispatch(fetchDocumentsByCollection(linkedCollectionId)).unwrap();
          setDocumentsByCollection(prev => ({
            ...prev,
            [linkedCollectionId]: payload.documents.map(doc => ({
              id: doc.id,
              title: doc.title
            }))
          }));
          
          const elementBasedTitle = getElementBasedDocumentTitle(linkedDocumentId);
          linkedDocTitle = elementBasedTitle || getDocumentTitle(linkedDocumentId, linkedCollectionId);
        } catch (error) {
          linkedDocTitle = `Document ${linkedDocumentId}`;
          console.error('Error fetching linked document:', error);
        } finally {
          setIsLoadingDocuments(false);
        }
      } else {
        const elementBasedTitle = getElementBasedDocumentTitle(linkedDocumentId);
        if (elementBasedTitle) {
          linkedDocTitle = elementBasedTitle;
        }
      }
      
      const primaryDocument = viewedDocuments[0];
      
      setViewedDocuments([
        primaryDocument,
        {
          id: linkedDocumentId,
          collectionId: linkedCollectionId,
          title: linkedDocTitle
        }
      ]);
      
      if (pendingScrollTarget && viewedDocuments.length > 1) {
        const oldSecondaryId = viewedDocuments[1].id;
        if (pendingScrollTarget.documentId === oldSecondaryId) {
          setPendingScrollTarget(null);
        }
      }
      
      setPendingScrollTarget({
        documentId: linkedDocumentId,
        targetInfo,
        allTargets
      });
      
    } finally {
      isUpdatingDocuments.current = false;
    }
  }, [dispatch, documentsByCollection, getDocumentTitle, getElementBasedDocumentTitle, viewedDocuments, pendingScrollTarget]);

  // Replace primary document function
  const replacePrimaryDocument = useCallback(async (
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
  ) => {
    if (isUpdatingDocuments.current) {
      return;
    }
    
    isUpdatingDocuments.current = true;
    
    try {
      let linkedDocTitle = getDocumentTitle(linkedDocumentId, linkedCollectionId);
      
      if (linkedDocTitle.includes('Document ') && !documentsByCollection[linkedCollectionId]) {
        setIsLoadingDocuments(true);
        
        try {
          const payload = await dispatch(fetchDocumentsByCollection(linkedCollectionId)).unwrap();
          setDocumentsByCollection(prev => ({
            ...prev,
            [linkedCollectionId]: payload.documents.map(doc => ({
              id: doc.id,
              title: doc.title
            }))
          }));
          
          const elementBasedTitle = getElementBasedDocumentTitle(linkedDocumentId);
          linkedDocTitle = elementBasedTitle || getDocumentTitle(linkedDocumentId, linkedCollectionId);
        } catch (error) {
          linkedDocTitle = `Document ${linkedDocumentId}`;
          console.error('Error fetching linked document:', error);
        } finally {
          setIsLoadingDocuments(false);
        }
      } else {
        const elementBasedTitle = getElementBasedDocumentTitle(linkedDocumentId);
        if (elementBasedTitle) {
          linkedDocTitle = elementBasedTitle;
        }
      }
      
      const secondaryDocument = viewedDocuments[1];
      
      setViewedDocuments([
        {
          id: linkedDocumentId,
          collectionId: linkedCollectionId,
          title: linkedDocTitle
        },
        secondaryDocument
      ]);
      
      if (pendingScrollTarget && viewedDocuments.length > 0) {
        const oldPrimaryId = viewedDocuments[0].id;
        if (pendingScrollTarget.documentId === oldPrimaryId) {
          setPendingScrollTarget(null);
        }
      }
      
      setPendingScrollTarget({
        documentId: linkedDocumentId,
        targetInfo,
        allTargets
      });
      
    } finally {
      isUpdatingDocuments.current = false;
    }
  }, [dispatch, documentsByCollection, getDocumentTitle, getElementBasedDocumentTitle, viewedDocuments, pendingScrollTarget]);

  // Add linked document as secondary
  const addLinkedDocumentAsSecondary = useCallback(async (
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
  ) => {
    if (isUpdatingDocuments.current) {
      return;
    }
    
    isUpdatingDocuments.current = true;
    
    try {
      try {
        await dispatch(fetchDocumentElements(linkedDocumentId)).unwrap();
      } catch (error) {
        console.error('Error fetching linked document elements:', error);
      }
      
      const linkedDocTitle = getDocumentTitle(linkedDocumentId, linkedCollectionId);
      
      setViewedDocuments(prev => {
        const newDoc = {
          id: linkedDocumentId,
          collectionId: linkedCollectionId,
          title: linkedDocTitle
        };
        return [...prev, newDoc];
      });
      
      setPendingScrollTarget({
        documentId: linkedDocumentId,
        targetInfo,
        allTargets
      });
      
    } finally {
      isUpdatingDocuments.current = false;
    }
  }, [dispatch, getDocumentTitle]);

  const handleOpenLinkedDocument = useCallback(async (
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
  ) => {
    // Create unique session ID for this navigation
    const sessionId = `nav-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Start navigation session in Redux
    dispatch(startNavigationSession({ sessionId }));
    
    // Determine the actual target document to open
    let actualTargetDocumentId = linkedDocumentId;
    let actualTargetInfo = targetInfo;
    
    // If we have multiple targets, find the target document (different from source)
    if (allTargets && allTargets.length > 1) {
      for (const target of allTargets) {
        const elementIdMatch = target.sourceURI.match(/\/DocumentElements\/(\d+)/);
        if (elementIdMatch) {
          const elementId = parseInt(elementIdMatch[1]);
          const element = allElements.find(el => el.id === elementId);
          
          if (element && element.document_id !== linkedDocumentId) {
            actualTargetDocumentId = element.document_id;
            actualTargetInfo = {
              sourceURI: target.sourceURI,
              start: target.start,
              end: target.end
            };
            break;
          }
        }
      }
    }

    const triggerReduxSynchronizedHighlighting = (delay: number = 2500) => {
      
      setTimeout(() => {
        try {
          if (!allTargets || allTargets.length === 0) {
            console.log('🎯 No targets to highlight');
            dispatch(clearNavigationSession({ sessionId }));
            return;
          }
          
          // Find the target element to scroll to
          const targetElement = allTargets.find(target => {
            const elementIdMatch = target.sourceURI.match(/\/DocumentElements\/(\d+)/);
            if (elementIdMatch) {
              const elementId = parseInt(elementIdMatch[1]);
              const element = allElements.find(el => el.id === elementId);
              return element && element.document_id !== linkedDocumentId; // Not the source document
            }
            return false;
          });
          
          if (targetElement) {
            const domElement = document.getElementById(targetElement.sourceURI.replace('/', ''));
            if (domElement) {
              domElement.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
                inline: 'nearest'
              });
            }
          }
          
          // Add all targets to Redux store simultaneously for perfect sync
          allTargets.forEach((target, index) => {
            const elementIdMatch = target.sourceURI.match(/\/DocumentElements\/(\d+)/);
            if (elementIdMatch) {
              const elementId = parseInt(elementIdMatch[1]);
              const element = allElements.find(el => el.id === elementId);
              
              if (element) {
                const isSource = element.document_id === linkedDocumentId;
                const elementType = isSource ? 'source' : 'target';
                
                // Add slight stagger for visual effect (50ms between elements)
                setTimeout(() => {
                  dispatch(addNavigationHighlight({
                    elementURI: target.sourceURI,
                    type: elementType,
                    sessionId
                  }));
                }, index * 50);
              }
            }
          });
          
          // Auto-cleanup after animation completes
          const cleanupDelay = 3500 + (allTargets.length * 50); // Base animation time + stagger time
          setTimeout(() => {
            dispatch(clearNavigationSession({ sessionId }));
          }, cleanupDelay);
          
        } catch (error) {
          console.error('Redux highlighting error:', error);
          dispatch(clearNavigationSession({ sessionId }));
        }
      }, delay);
    };

    // Redux synchronized highlighting with tight timing for replacement scenarios
    const triggerTightlySynchronizedHighlighting = async (
      sourceDocId: number,
      replacementFunction: () => Promise<void>,
      delay: number = 200
    ) => {
      // Step 1: Execute the document replacement first
      await replacementFunction();
      
      // Step 2: Wait for DOM to settle, then highlight BOTH source and target together
      setTimeout(() => {   
        try {
          if (!allTargets || allTargets.length === 0) {
            dispatch(clearNavigationSession({ sessionId }));
            return;
          }
          
          // Add ALL targets to Redux store with minimal stagger for tight synchronization
          allTargets.forEach((target, index) => {
            const elementIdMatch = target.sourceURI.match(/\/DocumentElements\/(\d+)/);
            if (elementIdMatch) {
              const elementId = parseInt(elementIdMatch[1]);
              const element = allElements.find(el => el.id === elementId);
              
              if (element) {
                const isSource = element.document_id === sourceDocId;
                const elementType = isSource ? 'source' : 'target';
                
                // Use minimal stagger (25ms) for tight synchronization
                setTimeout(() => {
                  dispatch(addNavigationHighlight({
                    elementURI: target.sourceURI,
                    type: elementType,
                    sessionId
                  }));
                }, index * 25);
              }
            }
          });
          
          // Auto-cleanup after animation completes
          const cleanupDelay = 3500 + (allTargets.length * 25);
          setTimeout(() => {
            dispatch(clearNavigationSession({ sessionId }));
          }, cleanupDelay);
          
        } catch (error) {
          console.error('Synchronized highlighting error:', error);
          dispatch(clearNavigationSession({ sessionId }));
        }
      }, delay);
    };
    
    if (isUpdatingDocuments.current) {
      dispatch(clearNavigationSession({ sessionId }));
      return;
    }
    
    // Check if the TARGET document is already viewed (not the source)
    const isTargetAlreadyViewed = viewedDocuments.some(doc => doc.id === actualTargetDocumentId);
    const isSourceSameAsTarget = actualTargetDocumentId === linkedDocumentId;

    if (isTargetAlreadyViewed && isSourceSameAsTarget) {
      triggerReduxSynchronizedHighlighting(500); // Shorter delay for same document
      return;
    }
    
    if (isTargetAlreadyViewed && !isSourceSameAsTarget) {
      triggerReduxSynchronizedHighlighting(500); // Shorter delay since both documents are ready
      return;
    }

    try {
      if (viewedDocuments.length === 1) {
        
        // Add secondary document
        await addLinkedDocumentAsSecondary(actualTargetDocumentId, linkedCollectionId, actualTargetInfo, allTargets);
        
        // Standard synchronization via Redux
        triggerReduxSynchronizedHighlighting(2500);
        
      } else if (viewedDocuments.length === 2) {
        
        const primaryDocId = viewedDocuments[0].id;
        const secondaryDocId = viewedDocuments[1].id;
        
        if (linkedDocumentId === primaryDocId) {
          
          // Replace secondary document
          await replaceSecondaryDocument(actualTargetDocumentId, linkedCollectionId, actualTargetInfo, allTargets);
          
          // Standard synchronization via Redux
          triggerReduxSynchronizedHighlighting(2500);
          
        } else if (linkedDocumentId === secondaryDocId) {
          
          // Use tightly synchronized highlighting for perfect timing
          await triggerTightlySynchronizedHighlighting(
            linkedDocumentId, // Source document ID (secondary)
            async () => {
              await replacePrimaryDocument(actualTargetDocumentId, linkedCollectionId, actualTargetInfo, allTargets);
            },
            200 // Short delay for tight synchronization
          );
          
        } else {
          await replaceSecondaryDocument(actualTargetDocumentId, linkedCollectionId, actualTargetInfo, allTargets);
          triggerReduxSynchronizedHighlighting(2500);
        }
        
      } else {
        dispatch(clearNavigationSession({ sessionId }));
      }
      
    } catch (error) {
      console.error('Error in document navigation:', error);
      dispatch(clearNavigationSession({ sessionId }));
    }

  }, [
    viewedDocuments,
    addLinkedDocumentAsSecondary,
    replaceSecondaryDocument,
    replacePrimaryDocument,
    allElements,
    dispatch
  ]);

  // Handle comparison document changes
  const handleComparisonDocumentChange = useCallback(async (newComparisonDocumentId: number | null) => {
    if (newComparisonDocumentId === null) {
      setViewedDocuments(prev => prev.slice(0, 1));
      setComparisonDocumentId(null);
    } else {
      const primaryDocument = viewedDocuments[0];
      const comparisonDocTitle = getDocumentTitle(newComparisonDocumentId, selectedCollectionId);
      
      setViewedDocuments([
        primaryDocument,
        {
          id: newComparisonDocumentId,
          collectionId: selectedCollectionId,
          title: comparisonDocTitle
        }
      ]);
      
      setComparisonDocumentId(newComparisonDocumentId);
    }
  }, [viewedDocuments, selectedCollectionId, getDocumentTitle]);
  
  // Handle adding a document for comparison
  const handleAddComparisonDocument = useCallback((docId: number) => {
    handleComparisonDocumentChange(docId);
  }, [handleComparisonDocumentChange]);
  
  // Handle removing a document from comparison
  const handleRemoveDocument = useCallback((docId: number) => {
    setViewedDocuments(prev => prev.filter(doc => doc.id !== docId));
    
    if (pendingScrollTarget && pendingScrollTarget.documentId === docId) {
      setPendingScrollTarget(null);
    }
    
    if (docId === comparisonDocumentId) {
      setComparisonDocumentId(null);
    }
    
    if (docId === Number(documentId)) {
      navigate(`/collections/${collectionId}`);
    }
  }, [pendingScrollTarget, comparisonDocumentId, documentId, collectionId, navigate]);
  
  // Handle back button
  const handleBackToDocuments = useCallback(() => {
    navigate(`/collections/${collectionId}`);
  }, [navigate, collectionId]);
  
  // Handle collection selection change
  const handleCollectionChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCollectionId = Number(e.target.value);
    setSelectedCollectionId(newCollectionId);
  }, []);
  
  // Toggle management panel collapsed state
  const toggleManagementPanel = useCallback(() => {
    setIsManagementPanelCollapsed(!isManagementPanelCollapsed);
  }, [isManagementPanelCollapsed]);
  
  // Handle view mode change
  const handleViewModeChange = useCallback((mode: 'reading' | 'annotations') => {
    setViewMode(mode);
  }, []);
  
  // Get available documents in the selected collection
  const availableInSelectedCollection = (documentsByCollection[selectedCollectionId] || [])
    .filter(doc => !viewedDocuments.some(viewedDoc => viewedDoc.id === doc.id));
  
  return (
    <div className="document-content-view">
      <div className="document-view-header">
        <button 
          onClick={handleBackToDocuments}
          className="back-button"
        >
          ← Back to Documents
        </button>
        
        {isLoadingDocuments && (
          <div 
            style={{
              position: 'fixed',
              top: '70px',
              right: '20px',
              zIndex: 1000,
              backgroundColor: '#1976d2',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '4px',
              fontSize: '14px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
            }}
          >
            Loading document...
          </div>
        )}
        
        <div className={`document-management-panel ${isManagementPanelCollapsed ? 'collapsed' : ''}`}>
          <div className="panel-header" onClick={toggleManagementPanel}>
            <h3>Document Comparison</h3>
            <button className="collapse-toggle" aria-label="Toggle panel">
              {isManagementPanelCollapsed ? '▼' : '▲'}
            </button>
          </div>
          
          {!isManagementPanelCollapsed && (
            <div className="panel-content">
              <div className="view-mode-toggle">
                <button 
                  className={`mode-button ${viewMode === 'reading' ? 'active' : ''}`}
                  onClick={() => handleViewModeChange('reading')}
                >
                  <span className="icon">📖</span> Reading
                </button>
                <button 
                  className={`mode-button ${viewMode === 'annotations' ? 'active' : ''}`}
                  onClick={() => handleViewModeChange('annotations')}
                >
                  <span className="icon">💬</span> Annotations
                </button>
                <button 
                  className={`mode-button ${showLinkedTextHighlights ? 'active' : ''}`}
                  onClick={() => setShowLinkedTextHighlights(!showLinkedTextHighlights)}
                  title="Highlight all text that has links in both documents"
                >
                  <span className="icon">🔗</span> Show Links
                </button>
              </div>

              {viewedDocuments.length === 2 && (
                <div className="document-linking-controls">
                  <button
                    onClick={() => setIsLinkingModeActive(true)}
                    className="link-documents-btn"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      width: '100%',
                      padding: '8px 12px',
                      backgroundColor: isLinkingModeActive ? '#1976d2' : '#e3f2fd',
                      border: '1px solid #1976d2',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 500,
                      color: isLinkingModeActive ? 'white' : '#1976d2',
                      marginBottom: '12px'
                    }}
                  >
                    <span className="icon">🔗</span>
                    {isLinkingModeActive ? 'Linking Mode Active' : 'Link Documents'}
                  </button>
                  
                  <div style={{
                    fontSize: '12px',
                    color: '#666',
                    fontStyle: 'italic',
                    padding: '8px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '4px',
                    marginBottom: '12px'
                  }}>
                    💡 Right-click on linked text to navigate between documents
                  </div>
                </div>
              )}
              
              <div className="viewed-documents">
                <h4>Currently Viewing:</h4>
                <ul className="document-list">
                  {viewedDocuments.map((doc, index) => (
                    <li key={doc.id} className="document-item">
                      <span className="document-indicator">
                        {index === 0 ? '📄' : '📋'} 
                      </span>
                      <span className="document-title">{doc.title}</span>
                      {index === 0 && (
                        <span style={{ fontSize: '11px', color: '#666', marginLeft: '6px' }}>
                          (primary)
                        </span>
                      )}
                      <button 
                        onClick={() => handleRemoveDocument(doc.id)}
                        className="remove-document-btn"
                        aria-label="Remove document"
                        disabled={index === 0 && viewedDocuments.length === 1}
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              
              {viewedDocuments.length < 2 && (
                <div className="add-document-controls">
                  <h4>Add Document for Comparison:</h4>
                  
                  <div className="collection-selector">
                    <label htmlFor="collection-select">Collection:</label>
                    <select 
                      id="collection-select"
                      value={selectedCollectionId}
                      onChange={handleCollectionChange}
                      className="collection-select"
                    >
                      {documentCollections.map(collection => (
                        <option key={collection.id} value={collection.id}>
                          {collection.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="document-selector">
                    <label htmlFor="document-select">Document:</label>
                    <select 
                      id="document-select"
                      onChange={(e) => {
                        const selectedId = Number(e.target.value);
                        if (selectedId) {
                          handleAddComparisonDocument(selectedId);
                        }
                      }}
                      value={comparisonDocumentId || ""}
                      className="document-select"
                      disabled={isLoadingDocuments || availableInSelectedCollection.length === 0}
                    >
                      {isLoadingDocuments ? (
                        <option value="">Loading...</option>
                      ) : (
                        <>
                          <option value="">
                            {availableInSelectedCollection.length === 0 
                              ? "No other documents available" 
                              : "Select a document"}
                          </option>
                          {availableInSelectedCollection.map(doc => (
                            <option key={doc.id} value={doc.id}>
                              {doc.title || `Document ${doc.id}`}
                            </option>
                          ))}
                        </>
                      )}
                    </select>
                  </div>
                </div>
              )}

              {process.env.NODE_ENV === 'development' && (
                <div style={{
                  marginTop: '16px',
                  padding: '8px',
                  backgroundColor: '#f0f0f0',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontFamily: 'monospace'
                }}>
                  <div><strong>Debug Info:</strong></div>
                  <div>Total elements loaded: {allElements.length}</div>
                  <div>Critical elements: {allElements.filter(el => [33, 34, 523, 524].includes(el.id)).map(el => el.id).join(', ') || 'none'}</div>
                  <div>Viewed documents: {viewedDocuments.length}</div>
                  <div>Collections loaded: {Object.keys(documentsByCollection).length}</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {viewedDocuments.length > 0 ? (
        <DocumentComparisonContainer 
          documents={viewedDocuments}
          viewMode={viewMode}
          handleViewModeChange={handleViewModeChange}
          isLinkingModeActive={isLinkingModeActive}
          onOpenLinkedDocument={handleOpenLinkedDocument}
          showLinkedTextHighlights={showLinkedTextHighlights}
        />
      ) : (
        <div className="no-documents-message">
          No documents selected for viewing
        </div>
      )}

      {isLinkingModeActive && (
        <DocumentLinkingOverlay
          documents={viewedDocuments}
          onClose={() => setIsLinkingModeActive(false)}
        />
      )}
    </div>
  );
};

export default DocumentViewerContainer;