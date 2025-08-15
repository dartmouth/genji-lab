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
import { RootState } from '@store';
import DocumentCollectionGallery from "@documentGallery/DocumentCollectionGallery";
import DocumentGallery from "@documentGallery/components/DocumentGallery";
import { DocumentComparisonContainer } from "@documentView";
import DocumentLinkingOverlay from '@/features/documentView/components/annotationCard/DocumentLinkingOverlay';
import { scrollToAndHighlightText, highlightSourceTextImmediately } from '@/features/documentView/utils/scrollToTextUtils';
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
  content?: any;
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
      // Silent - no logging
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
        .catch((error) => {
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
          // Silent
        }
      });
      
      await Promise.all(loadPromises);
    } catch (error) {
      // Silent
    }
  }, [dispatch]);

  // Load all documents and cross-document elements
  useEffect(() => {
    dispatch(fetchAllDocuments())
      .unwrap()
      .then((allDocuments) => {
        return loadCrossDocumentElements();
      })
      .catch((error) => {
        // Silent
      });
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
        .catch((error) => {
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
        // Silent
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

// 🔧 FIXED: Enhanced handleOpenLinkedDocument with proper target document detection
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
  console.log('🔗🔗🔗 === NAVIGATION STARTED ===');
  console.log('🔗 Source document (clicked from):', linkedDocumentId);
  console.log('🔗 All targets count:', allTargets?.length || 0);
  console.log('🔗 Current viewed documents:', viewedDocuments.map(d => ({ id: d.id, title: d.title })));
  
  // 🎯 CRITICAL FIX: Determine the actual target document to open
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
          console.log('🎯 Found target document:', actualTargetDocumentId, 'from element:', elementId);
          break;
        }
      }
    }
  }
  
  console.log('🔗 Actual target document to open:', actualTargetDocumentId);
  
  // 🎯 HELPER: Find source target for immediate highlighting
  const getSourceTarget = (sourceDocId: number) => {
    return allTargets?.find(target => {
      const elementIdMatch = target.sourceURI.match(/\/DocumentElements\/(\d+)/);
      if (elementIdMatch) {
        const elementId = parseInt(elementIdMatch[1]);
        const element = allElements.find(el => el.id === elementId);
        return element && element.document_id === sourceDocId;
      }
      return false;
    });
  };
  
  // 🎯 HELPER: Get targets for specific document
  const getTargetsForDocument = (docId: number) => {
    return allTargets?.filter(target => {
      const elementIdMatch = target.sourceURI.match(/\/DocumentElements\/(\d+)/);
      if (elementIdMatch) {
        const elementId = parseInt(elementIdMatch[1]);
        const element = allElements.find(el => el.id === elementId);
        return element && element.document_id === docId;
      }
      return false;
    }) || [];
  };
  
  // 🎯 HELPER: Trigger highlighting with proper timing
  const triggerTargetHighlighting = (
    targetDocId: number,
    targetInfoParam: { sourceURI: string; start: number; end: number },
    targets: typeof allTargets,
    delay: number = 2500,
    skipSourceHighlighting: boolean = false
  ) => {
    setTimeout(() => {
      try {
        console.log(`🎯 Executing target highlighting for document ${targetDocId}`);
        console.log(`🎯 Skip source: ${skipSourceHighlighting}, Targets: ${targets?.length || 0}`);
        
        if (skipSourceHighlighting && targets) {
          const nonSourceTargets = targets.filter(target => {
            const elementIdMatch = target.sourceURI.match(/\/DocumentElements\/(\d+)/);
            if (elementIdMatch) {
              const elementId = parseInt(elementIdMatch[1]);
              const element = allElements.find(el => el.id === elementId);
              return element && element.document_id === targetDocId;
            }
            return false;
          });
          
          console.log(`🎯 Filtered to ${nonSourceTargets.length} target-only elements`);
          scrollToAndHighlightText(targetInfoParam, nonSourceTargets);
        } else {
          scrollToAndHighlightText(targetInfoParam, targets);
        }
      } catch (error) {
        console.log('🎯 Error in target highlighting:', error);
      }
    }, delay);
  };
  
  if (isUpdatingDocuments.current) {
    console.log('🔗 ⚠️ Update in progress, skipping');
    return;
  }
  
  // 🔧 FIXED: Check if the TARGET document is already viewed, not the source
  const isTargetAlreadyViewed = viewedDocuments.some(doc => doc.id === actualTargetDocumentId);
  console.log('🔗 Target document already viewed:', isTargetAlreadyViewed);
  
  if (isTargetAlreadyViewed && actualTargetDocumentId === linkedDocumentId) {
    // Same document navigation - just highlight
    console.log('🔗 === SAME DOCUMENT - SIMPLE HIGHLIGHT ===');
    
    try {
      scrollToAndHighlightText(targetInfo, allTargets);
    } catch (error) {
      console.log('🔗 Error scrolling:', error);
    }
    return;
  }
  
  if (isTargetAlreadyViewed && actualTargetDocumentId !== linkedDocumentId) {
    // Cross-document navigation between already viewed documents
    console.log('🔗 === CROSS-DOCUMENT HIGHLIGHT (BOTH OPEN) ===');
    
    try {
      scrollToAndHighlightText(actualTargetInfo, allTargets);
    } catch (error) {
      console.log('🔗 Error in cross-document highlight:', error);
    }
    return;
  }
  
  // 🔗 TARGET DOCUMENT NEEDS TO BE OPENED
  console.log('🔗 === OPENING TARGET DOCUMENT ===');
  console.log('🔗 Current document count:', viewedDocuments.length);
  
  try {
    if (viewedDocuments.length === 1) {
      console.log('🔗 *** SINGLE TO DUAL MODE - UNIFIED HIGHLIGHTING ***');
      
      await addLinkedDocumentAsSecondary(actualTargetDocumentId, linkedCollectionId, actualTargetInfo, allTargets);
      triggerTargetHighlighting(actualTargetDocumentId, actualTargetInfo, allTargets, 2500, false);
      
    } else if (viewedDocuments.length === 2) {
      console.log('🔗 *** DUAL MODE REPLACEMENT - IMMEDIATE SOURCE + DELAYED TARGET ***');
      
      const primaryDocId = viewedDocuments[0].id;
      const secondaryDocId = viewedDocuments[1].id;
      
      if (linkedDocumentId === primaryDocId) {
        console.log('🔗 *** CLICKED FROM PRIMARY - REPLACE SECONDARY ***');
        
        // Immediate source highlighting
        const sourceTarget = getSourceTarget(primaryDocId);
        if (sourceTarget) {
          console.log('🎯 Highlighting primary source immediately:', sourceTarget.sourceURI);
          highlightSourceTextImmediately(sourceTarget.sourceURI, sourceTarget.start, sourceTarget.end);
        }
        
        // Replace secondary document
        await replaceSecondaryDocument(actualTargetDocumentId, linkedCollectionId, actualTargetInfo, allTargets);
        
        // Delayed target highlighting
        const targetTargets = getTargetsForDocument(actualTargetDocumentId);
        triggerTargetHighlighting(actualTargetDocumentId, actualTargetInfo, targetTargets, 2500, true);
        
      } else if (linkedDocumentId === secondaryDocId) {
        console.log('🔗 *** CLICKED FROM SECONDARY - REPLACE PRIMARY ***');
        
        // 🎯 IMMEDIATE: Highlight source before document replacement
        const sourceTarget = getSourceTarget(secondaryDocId);
        if (sourceTarget) {
          console.log('🎯 Highlighting secondary source immediately:', sourceTarget.sourceURI);
          highlightSourceTextImmediately(sourceTarget.sourceURI, sourceTarget.start, sourceTarget.end);
        }
        
        // Replace primary document
        await replacePrimaryDocument(actualTargetDocumentId, linkedCollectionId, actualTargetInfo, allTargets);
        
        // 🎯 DELAYED: Highlight target elements only (source already done)
        const targetTargets = getTargetsForDocument(actualTargetDocumentId);
        triggerTargetHighlighting(actualTargetDocumentId, actualTargetInfo, targetTargets, 2500, true);
        
      } else {
        console.log('🔗 Context menu or other - replacing secondary');
        await replaceSecondaryDocument(actualTargetDocumentId, linkedCollectionId, actualTargetInfo, allTargets);
      }
    }
  } catch (error) {
    console.log('🔗 Error opening linked document:', error);
  }
  
  console.log('🔗🔗🔗 === NAVIGATION COMPLETED ===');
}, [
  viewedDocuments, 
  addLinkedDocumentAsSecondary, 
  replaceSecondaryDocument, 
  replacePrimaryDocument, 
  allElements, 
  scrollToAndHighlightText,
  highlightSourceTextImmediately
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