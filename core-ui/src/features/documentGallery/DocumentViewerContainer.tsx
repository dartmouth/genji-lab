// src/features/documentGallery/DocumentViewerContainer.tsx
// COMPLETE REWRITE - Cross-document navigation with proper element loading and type safety

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
      
      console.log('🔄 Total elements collected from', referencedDocumentIds.size, 'documents:', elements.length);
      
      // Debug critical elements
      const criticalElements = elements.filter(el => [33, 34, 523, 524].includes(el.id));
      if (criticalElements.length > 0) {
        console.log('🔄 🎯 Found critical cross-document elements:', criticalElements.map(el => ({ id: el.id, docId: el.document_id })));
      } else {
        console.log('🔄 ⚠️ Critical cross-document elements (33, 34, 523, 524) not found in Redux');
      }
      
    } catch (error) {
      console.warn('Error getting elements from annotations:', error);
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
  const [localSelectedCollectionId, setLocalSelectedCollectionId] = useState<number>(Number(collectionId));
  
  // State for management panel collapse
  const [isManagementPanelCollapsed, setIsManagementPanelCollapsed] = useState(true);
  
  // State for view mode (reading vs annotations)
  const [viewMode, setViewMode] = useState<'reading' | 'annotations'>('reading');
  
  // State for showing linked text highlights
  const [showLinkedTextHighlights, setShowLinkedTextHighlights] = useState(false);

  // State to track if we're in comparison mode
  const [comparisonDocumentId, setComparisonDocumentId] = useState<number | null>(null);

  // Cross-document element loader with proper typing
  const loadCrossDocumentElements = useCallback(async () => {
    console.log('🌐 === LOADING CROSS-DOCUMENT ELEMENTS ===');
    
    try {
      // Based on database analysis, preload critical documents that contain cross-document elements
      const criticalDocuments = [2, 21]; // Documents containing elements 33, 34, 523, 524
      
      console.log('🌐 Loading critical documents:', criticalDocuments);
      
      const loadPromises = criticalDocuments.map(async (docId) => {
        try {
          console.log('🌐 Loading elements for document', docId);
          await dispatch(fetchDocumentElements(docId)).unwrap();
          console.log('🌐 ✅ Loaded elements for document', docId);
        } catch (error) {
          console.error('🌐 ❌ Failed to load elements for document', docId, ':', error);
        }
      });
      
      await Promise.all(loadPromises);
      console.log('🌐 ✅ Cross-document element loading complete');
      
    } catch (error) {
      console.error('🌐 ❌ Error in cross-document element loading:', error);
    }
  }, [dispatch]);

  // Load all documents and cross-document elements
  useEffect(() => {
    console.log('🎯 Loading all documents and cross-document elements...');
    dispatch(fetchAllDocuments())
      .unwrap()
      .then((allDocuments) => {
        console.log('🎯 ✅ Successfully loaded', allDocuments.length, 'documents');
        return loadCrossDocumentElements();
      })
      .catch((error) => {
        console.warn('🎯 ⚠️ Failed to load all documents:', error);
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
          console.log('📄 Fetched documents for collection', collectionId, ':', payload.documents.length);
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
          console.error('❌ Failed to fetch documents for collection', collectionId, ':', error);
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
      
      console.log('📄 Setting up initial document view:', { docId, colId });
      
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
      console.log('📄 Setting comparison document ID to:', comparisonDoc.id);
      setComparisonDocumentId(comparisonDoc.id);
    } else if (viewedDocuments.length === 1) {
      console.log('📄 Clearing comparison document ID');
      setComparisonDocumentId(null);
    }
  }, [viewedDocuments]);
  
  // Handle scrolling with better timing and error handling
  useEffect(() => {
    if (pendingScrollTarget && viewedDocuments.some(doc => doc.id === pendingScrollTarget.documentId)) {
      console.log('🔄 Document loaded, executing pending scroll with allTargets:', pendingScrollTarget.allTargets?.length || 0);
      
      const scrollTimeout = setTimeout(() => {
        try {
          const documentPanel = document.querySelector(`[data-document-id="${pendingScrollTarget.documentId}"]`);
          if (documentPanel) {
            console.log('🔄 Document panel found, executing scroll');
            scrollToAndHighlightText(pendingScrollTarget.targetInfo, pendingScrollTarget.allTargets);
            setPendingScrollTarget(null);
          } else {
            console.warn('🔄 Document panel not found yet, will retry');
            setTimeout(() => {
              console.log('🔄 Retrying scroll to target');
              scrollToAndHighlightText(pendingScrollTarget.targetInfo, pendingScrollTarget.allTargets);
              setPendingScrollTarget(null);
            }, 2000);
          }
        } catch (error) {
          console.error('🔄 Error executing scroll:', error);
          setPendingScrollTarget(null);
        }
      }, 1500);
      
      return () => clearTimeout(scrollTimeout);
    }
  }, [pendingScrollTarget, viewedDocuments]);

  // Add this helper function before the navigation functions:

const getElementBasedDocumentTitle = useCallback((documentId: number): string | null => {
  // Try to find the document in Redux store first
  const document = documents.find(doc => doc.id === documentId);
  if (document && document.title && !document.title.includes('Document ')) {
    return document.title;
  }
  
  // Try to find in documentsByCollection cache
  for (const collectionId in documentsByCollection) {
    const doc = documentsByCollection[collectionId].find(d => d.id === documentId);
    if (doc && doc.title && !doc.title.includes('Document ')) {
      return doc.title;
    }
  }
  
  // Try to find in viewedDocuments
  const viewedDoc = viewedDocuments.find(doc => doc.id === documentId);
  if (viewedDoc && viewedDoc.title && !viewedDoc.title.includes('Document ')) {
    return viewedDoc.title;
  }
  
  return null; // Let the API response provide the title
}, [documents, documentsByCollection, viewedDocuments]);

// Add this function (you're missing this one):

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
    console.log('🔄 Document update already in progress, skipping');
    return;
  }
  
  isUpdatingDocuments.current = true;
  console.log('🔄 === REPLACING SECONDARY DOCUMENT ===');
  console.log('🔄 Document ID:', linkedDocumentId, 'Collection ID:', linkedCollectionId);
  
  try {
    // Get the document title
    let linkedDocTitle = getDocumentTitle(linkedDocumentId, linkedCollectionId);
    
    // If we don't have the document in our cache, fetch the collection
    if (linkedDocTitle.includes('Document ') && !documentsByCollection[linkedCollectionId]) {
      console.log('🔄 Fetching collection for document metadata:', linkedCollectionId);
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
        
        // Use element-based mapping to get correct title
        const elementBasedTitle = getElementBasedDocumentTitle(linkedDocumentId);
        linkedDocTitle = elementBasedTitle || getDocumentTitle(linkedDocumentId, linkedCollectionId);
      } catch (error) {
        console.error('🔄 Failed to fetch collection for linked document:', error);
        linkedDocTitle = `Document ${linkedDocumentId}`; // Fallback title
      } finally {
        setIsLoadingDocuments(false);
      }
    } else {
      // Even if we have cache, use element-based mapping for accurate titles
      const elementBasedTitle = getElementBasedDocumentTitle(linkedDocumentId);
      if (elementBasedTitle) {
        linkedDocTitle = elementBasedTitle;
        console.log('🔄 Using element-based title:', linkedDocTitle);
      }
    }
    
    // Keep primary, replace secondary
    const primaryDocument = viewedDocuments[0];
    
    setViewedDocuments([
      primaryDocument, // Keep primary
      {
        id: linkedDocumentId,
        collectionId: linkedCollectionId,
        title: linkedDocTitle
      } // New secondary
    ]);
    
    // Clear any pending scroll target for the old secondary document
    if (pendingScrollTarget && viewedDocuments.length > 1) {
      const oldSecondaryId = viewedDocuments[1].id;
      if (pendingScrollTarget.documentId === oldSecondaryId) {
        setPendingScrollTarget(null);
      }
    }
    
    // Set up pending scroll target for the new document
    console.log('🔄 Setting pending scroll target for replacement document');
    setPendingScrollTarget({
      documentId: linkedDocumentId,
      targetInfo,
      allTargets
    });
    
  } finally {
    isUpdatingDocuments.current = false;
  }
}, [dispatch, documentsByCollection, getDocumentTitle, getElementBasedDocumentTitle, viewedDocuments, pendingScrollTarget]);

// Fix the replacePrimaryDocument function dependencies:

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
    console.log('🔄 Document update already in progress, skipping');
    return;
  }
  
  isUpdatingDocuments.current = true;
  console.log('🔄 === REPLACING PRIMARY DOCUMENT ===');
  console.log('🔄 Document ID:', linkedDocumentId, 'Collection ID:', linkedCollectionId);
  
  try {
    // Get the document title
    let linkedDocTitle = getDocumentTitle(linkedDocumentId, linkedCollectionId);
    
    // If we don't have the document in our cache, fetch the collection
    if (linkedDocTitle.includes('Document ') && !documentsByCollection[linkedCollectionId]) {
      console.log('🔄 Fetching collection for document metadata:', linkedCollectionId);
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
        
        // Use element-based mapping to get correct title
        const elementBasedTitle = getElementBasedDocumentTitle(linkedDocumentId);
        linkedDocTitle = elementBasedTitle || getDocumentTitle(linkedDocumentId, linkedCollectionId);
      } catch (error) {
        console.error('🔄 Failed to fetch collection for linked document:', error);
        linkedDocTitle = `Document ${linkedDocumentId}`; // Fallback title
      } finally {
        setIsLoadingDocuments(false);
      }
    } else {
      // Even if we have cache, use element-based mapping for accurate titles
      const elementBasedTitle = getElementBasedDocumentTitle(linkedDocumentId);
      if (elementBasedTitle) {
        linkedDocTitle = elementBasedTitle;
        console.log('🔄 Using element-based title:', linkedDocTitle);
      }
    }
    
    // Keep secondary, replace primary
    const secondaryDocument = viewedDocuments[1];
    
    setViewedDocuments([
      {
        id: linkedDocumentId,
        collectionId: linkedCollectionId,
        title: linkedDocTitle
      }, // New primary
      secondaryDocument // Keep secondary
    ]);
    
    // Clear any pending scroll target for the old primary document
    if (pendingScrollTarget && viewedDocuments.length > 0) {
      const oldPrimaryId = viewedDocuments[0].id;
      if (pendingScrollTarget.documentId === oldPrimaryId) {
        setPendingScrollTarget(null);
      }
    }
    
    // Set up pending scroll target for the new primary document
    console.log('🔄 Setting pending scroll target for replacement primary document');
    setPendingScrollTarget({
      documentId: linkedDocumentId,
      targetInfo,
      allTargets
    });
    
  } finally {
    isUpdatingDocuments.current = false;
  }
}, [dispatch, documentsByCollection, getDocumentTitle, getElementBasedDocumentTitle, viewedDocuments, pendingScrollTarget]);

  // Atomic document addition with element loading
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
      console.log('➕ Document update already in progress, skipping');
      return;
    }
    
    isUpdatingDocuments.current = true;
    console.log('➕ === ADDING LINKED DOCUMENT AS SECONDARY ===');
    console.log('➕ Document ID:', linkedDocumentId, 'Collection ID:', linkedCollectionId);
    
    try {
      // Ensure document elements are loaded
      try {
        console.log('➕ Ensuring elements are loaded for document', linkedDocumentId);
        await dispatch(fetchDocumentElements(linkedDocumentId)).unwrap();
        console.log('➕ ✅ Elements loaded for document', linkedDocumentId);
      } catch (error) {
        console.warn('➕ ⚠️ Failed to load elements for document', linkedDocumentId, ':', error);
      }
      
      // Get the document title
      const linkedDocTitle = getDocumentTitle(linkedDocumentId, linkedCollectionId);
      console.log('➕ Initial document title:', linkedDocTitle);
      
      setViewedDocuments(prev => {
        const newDoc = {
          id: linkedDocumentId,
          collectionId: linkedCollectionId,
          title: linkedDocTitle
        };
        const newList = [...prev, newDoc];
        console.log('➕ New viewed documents:', newList.map(d => d.title));
        return newList;
      });
      
      // Set up pending scroll target immediately after state update
      console.log('➕ === SETTING PENDING SCROLL TARGET ===');
      setPendingScrollTarget({
        documentId: linkedDocumentId,
        targetInfo,
        allTargets
      });
      
    } finally {
      isUpdatingDocuments.current = false;
    }
  }, [dispatch, getDocumentTitle]);

// REPLACE the existing handleOpenLinkedDocument function with this:

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
  console.log('🔗 === DOCUMENT VIEWER: handleOpenLinkedDocument called ===');
  console.log('🔗 Requested Document ID:', linkedDocumentId);
  console.log('🔗 Requested Collection ID:', linkedCollectionId);
  console.log('🔗 Current viewed documents:', viewedDocuments.map(d => ({ id: d.id, title: d.title })));
  console.log('🔗 Target Info:', targetInfo);
  console.log('🔗 All Targets Count:', allTargets?.length || 0);
  console.log('🔗 Update in progress:', isUpdatingDocuments.current);
  alert(`DEBUG:
    linkedDocumentId: ${linkedDocumentId}
    primaryDocId: ${viewedDocuments[0]?.id}
    secondaryDocId: ${viewedDocuments[1]?.id}
    Match primary? ${linkedDocumentId === viewedDocuments[0]?.id}
    Match secondary? ${linkedDocumentId === viewedDocuments[1]?.id}`);
  
  // Prevent multiple calls while updating
  if (isUpdatingDocuments.current) {
    console.log('🔗 ⚠️ Update already in progress, skipping call');
    return;
  }
  
  // Check if the document is already being viewed
  const isAlreadyViewed = viewedDocuments.some(doc => doc.id === linkedDocumentId);
  console.log('🔗 Document already viewed:', isAlreadyViewed);
  
  if (isAlreadyViewed) {
    // Document already viewed - find best content to navigate to
    console.log('🔗 === CONTENT-FOCUSED NAVIGATION FOR VIEWED DOCUMENT ===');
    
    if (!allTargets || allTargets.length <= 1) {
      // Only one target - just scroll to it
      console.log('🔗 Single target - scrolling to existing document content');
      try {
        scrollToAndHighlightText(targetInfo, allTargets);
      } catch (error) {
        console.error('🔗 Error scrolling to target:', error);
      }
      return;
    }
    
    // Multiple targets available - select best content target
    console.log('🔗 Multiple targets available - selecting best content target');
    
    // Map targets to their document IDs
    const targetsByDocId = new Map<number, Array<typeof allTargets[0]>>();
    for (const target of allTargets) {
      const elementIdMatch = target.sourceURI.match(/\/DocumentElements\/(\d+)/);
      if (!elementIdMatch) continue;
      
      const elementId = parseInt(elementIdMatch[1]);
      const element = allElements.find(el => el.id === elementId);
      
      if (element) {
        if (!targetsByDocId.has(element.document_id)) {
          targetsByDocId.set(element.document_id, []);
        }
        targetsByDocId.get(element.document_id)!.push(target);
        console.log('🔗 Mapped target', target.sourceURI, 'to document', element.document_id);
      }
    }
    
    console.log('🔗 Targets mapped to documents:', 
      Array.from(targetsByDocId.entries()).map(([docId, targets]) => ({ docId, count: targets.length }))
    );
    
    // Find best navigation target
    const currentDocumentIds = viewedDocuments.map(doc => doc.id);
    const clickSourceDoc = linkedDocumentId; // The document where the click occurred
    
    let bestTarget = null;
    let bestDocumentId = null;
    
    // Priority 1: Content in a different currently-viewed document
    for (const [docId, targets] of targetsByDocId.entries()) {
      if (docId !== clickSourceDoc && currentDocumentIds.includes(docId)) {
        bestTarget = targets[0];
        bestDocumentId = docId;
        console.log('🔗 Selected cross-document target in viewed document:', docId);
        break;
      }
    }
    
    // Priority 2: Content in a non-viewed document (open it)
    if (!bestTarget) {
      for (const [docId, targets] of targetsByDocId.entries()) {
        if (!currentDocumentIds.includes(docId)) {
          bestTarget = targets[0];
          bestDocumentId = docId;
          console.log('🔗 Selected target in non-viewed document:', docId);
          break;
        }
      }
    }
    
    // Priority 3: Different content in the same document
    if (!bestTarget) {
      const sameDocTargets = targetsByDocId.get(clickSourceDoc) || [];
      const differentTargets = sameDocTargets.filter(target => 
        target.sourceURI !== targetInfo.sourceURI || 
        target.start !== targetInfo.start || 
        target.end !== targetInfo.end
      );
      
      if (differentTargets.length > 0) {
        bestTarget = differentTargets[0];
        bestDocumentId = clickSourceDoc;
        console.log('🔗 Selected different content in same document');
      }
    }
    
    // Execute the navigation
    if (bestTarget && bestDocumentId) {
      console.log('🔗 === NAVIGATING TO SELECTED CONTENT ===');
      console.log('🔗 Target document:', bestDocumentId);
      console.log('🔗 Target URI:', bestTarget.sourceURI);
      
      if (bestDocumentId === linkedDocumentId) {
        // Same document - just scroll
        console.log('🔗 Scrolling to different content in same document');
        try {
          scrollToAndHighlightText({
            sourceURI: bestTarget.sourceURI,
            start: bestTarget.start,
            end: bestTarget.end
          }, allTargets);
        } catch (error) {
          console.error('🔗 Error scrolling to target:', error);
        }
      } else {
        // Different document - navigate there
        console.log('🔗 Navigating to different document:', bestDocumentId);
        
        const destinationTargets = targetsByDocId.get(bestDocumentId) || [bestTarget];
        
        if (currentDocumentIds.includes(bestDocumentId)) {
          // Target document is already open - just scroll to it
          console.log('🔗 Target document already open - scrolling to content');
          try {
            scrollToAndHighlightText({
              sourceURI: bestTarget.sourceURI,
              start: bestTarget.start,
              end: bestTarget.end
            }, allTargets);
          } catch (error) {
            console.error('🔗 Error scrolling to target document:', error);
          }
        } else {
          // Target document not open - determine which panel to replace
          console.log('🔗 Opening target document:', bestDocumentId);
          
          if (viewedDocuments.length === 1) {
            // Single document - add as secondary
            await addLinkedDocumentAsSecondary(
              bestDocumentId, 
              linkedCollectionId, 
              {
                sourceURI: bestTarget.sourceURI,
                start: bestTarget.start,
                end: bestTarget.end
              }, 
              destinationTargets
            );
          } else if (viewedDocuments.length === 2) {
            // Multi-document - determine which panel to replace based on source
            const primaryDocId = viewedDocuments[0].id;
            const secondaryDocId = viewedDocuments[1].id;
            
            if (linkedDocumentId === primaryDocId) {
              // Clicked from primary - replace secondary
              console.log('🔗 Clicked from primary - replacing secondary');
              await replaceSecondaryDocument(
                bestDocumentId, 
                linkedCollectionId, 
                {
                  sourceURI: bestTarget.sourceURI,
                  start: bestTarget.start,
                  end: bestTarget.end
                }, 
                destinationTargets
              );
            } else if (linkedDocumentId === secondaryDocId) {
              // Clicked from secondary - replace primary
              console.log('🔗 Clicked from secondary - replacing primary');
              await replacePrimaryDocument(
                bestDocumentId, 
                linkedCollectionId, 
                {
                  sourceURI: bestTarget.sourceURI,
                  start: bestTarget.start,
                  end: bestTarget.end
                }, 
                destinationTargets
              );
            } else {
              // Context menu click - default to replacing secondary
              console.log('🔗 Context menu click - replacing secondary by default');
              await replaceSecondaryDocument(
                bestDocumentId, 
                linkedCollectionId, 
                {
                  sourceURI: bestTarget.sourceURI,
                  start: bestTarget.start,
                  end: bestTarget.end
                }, 
                destinationTargets
              );
            }
          }
        }
      }
      return;
    }
    
    // Fallback: just scroll to the requested content
    console.log('🔗 === FALLBACK: Scrolling to requested content ===');
    try {
      scrollToAndHighlightText(targetInfo, allTargets);
    } catch (error) {
      console.error('🔗 Error in fallback scroll:', error);
    }
    
  } else {
    // Document not viewed - open new document
    console.log('🔗 === OPENING NEW DOCUMENT ===');
    console.log('🔗 Current document count:', viewedDocuments.length);
    
    try {
      if (viewedDocuments.length === 1) {
        // Single document - add as secondary
        console.log('🔗 === ADDING AS SECONDARY DOCUMENT ===');
        await addLinkedDocumentAsSecondary(linkedDocumentId, linkedCollectionId, targetInfo, allTargets);
      } else if (viewedDocuments.length === 2) {
        // Multi-document - determine which panel to replace based on source
        const primaryDocId = viewedDocuments[0].id;
        const secondaryDocId = viewedDocuments[1].id;
        
        // Since we're opening a NEW document, we need to decide which panel to replace
        // The linkedDocumentId here represents where the user clicked FROM
        // But we're opening a different document - so we use the target detection logic
        
        // Find the actual target document from allTargets
        let targetDocumentId = linkedDocumentId; // fallback
        
        if (allTargets && allTargets.length > 0) {
          for (const target of allTargets) {
            const elementIdMatch = target.sourceURI.match(/\/DocumentElements\/(\d+)/);
            if (elementIdMatch) {
              const elementId = parseInt(elementIdMatch[1]);
              const element = allElements.find(el => el.id === elementId);
              
              if (element && element.document_id !== linkedDocumentId) {
                // Found a target in a different document
                targetDocumentId = element.document_id;
                targetInfo = {
                  sourceURI: target.sourceURI,
                  start: target.start,
                  end: target.end
                };
                break;
              }
            }
          }
        }
        
        // Now determine replacement based on where the click came from
        if (linkedDocumentId === primaryDocId) {
          // Clicked from primary - replace secondary
          console.log('🔗 === REPLACING SECONDARY DOCUMENT (clicked from primary) ===');
          await replaceSecondaryDocument(targetDocumentId, linkedCollectionId, targetInfo, allTargets);
        } else if (linkedDocumentId === secondaryDocId) {
          // Clicked from secondary - replace primary
          console.log('🔗 === REPLACING PRIMARY DOCUMENT (clicked from secondary) ===');
          await replacePrimaryDocument(targetDocumentId, linkedCollectionId, targetInfo, allTargets);
        } else {
          // Context menu click from non-viewed document - default to replacing secondary
          console.log('🔗 === REPLACING SECONDARY DOCUMENT (context menu) ===');
          await replaceSecondaryDocument(targetDocumentId, linkedCollectionId, targetInfo, allTargets);
        }
      } else {
        console.warn('🔗 ⚠️ Unexpected document count:', viewedDocuments.length);
      }
    } catch (error) {
      console.error('🔗 Error opening linked document:', error);
    }
  }
  
  console.log('🔗 === DOCUMENT VIEWER: handleOpenLinkedDocument completed ===');
}, [
  viewedDocuments, 
  addLinkedDocumentAsSecondary, 
  replaceSecondaryDocument, 
  replacePrimaryDocument, 
  allElements, 
  scrollToAndHighlightText
]);

  // Handle comparison document changes
  const handleComparisonDocumentChange = useCallback(async (newComparisonDocumentId: number | null) => {
    if (newComparisonDocumentId === null) {
      setViewedDocuments(prev => prev.slice(0, 1));
      setComparisonDocumentId(null);
    } else {
      const primaryDocument = viewedDocuments[0];
      const comparisonDocTitle = getDocumentTitle(newComparisonDocumentId, localSelectedCollectionId);
      
      setViewedDocuments([
        primaryDocument,
        {
          id: newComparisonDocumentId,
          collectionId: localSelectedCollectionId,
          title: comparisonDocTitle
        }
      ]);
      
      setComparisonDocumentId(newComparisonDocumentId);
    }
  }, [viewedDocuments, localSelectedCollectionId, getDocumentTitle]);
  
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
    setLocalSelectedCollectionId(newCollectionId);
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
  const availableInSelectedCollection = (documentsByCollection[localSelectedCollectionId] || [])
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
                      value={localSelectedCollectionId}
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