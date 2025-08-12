// src/features/documentGallery/DocumentViewerContainer.tsx
// CRITICAL FIXES - Single click functionality and atomic state updates

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "@store/hooks";
import { 
  setSelectedCollectionId as setReduxSelectedCollectionId, 
  fetchDocumentsByCollection,
  fetchDocumentCollections,
  fetchAllDocuments,
  selectAllDocuments,
  selectAllDocumentCollections
} from "@store";
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
  
  // Fetch document collections when component mounts
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

// 🎯 CRITICAL FIX: Main document content view component with single-click functionality
export const DocumentContentView: React.FC = () => {
  const { collectionId, documentId } = useParams<{ collectionId: string; documentId: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  
  // 🎯 FIX: Use useRef for atomic state updates
  const isUpdatingDocuments = useRef(false);
  
  // State to track the documents being viewed
  const [viewedDocuments, setViewedDocuments] = useState<Array<{
    id: number, 
    collectionId: number,
    title: string
  }>>([]);
  
  // Track documents by collection to handle the API response structure
  const [documentsByCollection, setDocumentsByCollection] = useState<{
    [collectionId: number]: Array<{ id: number, title: string }>
  }>({});
  const [isLinkingModeActive, setIsLinkingModeActive] = useState(false);
  
  // 🎯 CRITICAL FIX: Simplified pending scroll target state
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

  useEffect(() => {
    console.log('🎯 Dispatching fetchAllDocuments for linked text functionality...');
    dispatch(fetchAllDocuments())
      .unwrap()
      .then((allDocuments) => {
        console.log('🎯 ✅ Successfully loaded', allDocuments.length, 'documents for linked text');
        console.log('🎯 Document titles:', allDocuments.map(doc => ({ id: doc.id, title: doc.title })));
      })
      .catch((error) => {
        console.warn('🎯 ⚠️ Failed to load all documents for linked text:', error);
        console.warn('🎯 Linked text titles may fall back to generic names');
      });
  }, [dispatch]);
  
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
          // Store the documents with their collection ID
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
  
  // Fetch documents for the selected collection (if different from current)
  useEffect(() => {
    if (localSelectedCollectionId && localSelectedCollectionId !== Number(collectionId) && 
        !documentsByCollection[localSelectedCollectionId]) {
      
      console.log('📄 Fetching documents for selected collection:', localSelectedCollectionId);
      setIsLoadingDocuments(true);
      
      dispatch(fetchDocumentsByCollection(localSelectedCollectionId))
        .unwrap()
        .then((payload) => {
          console.log('📄 Fetched documents for selected collection', localSelectedCollectionId, ':', payload.documents.length);
          setDocumentsByCollection(prev => ({
            ...prev,
            [localSelectedCollectionId]: payload.documents.map(doc => ({
              id: doc.id,
              title: doc.title
            }))
          }));
          setIsLoadingDocuments(false);
        })
        .catch((error) => {
          console.error('❌ Failed to fetch documents for selected collection', localSelectedCollectionId, ':', error);
          setIsLoadingDocuments(false);
        });
    }
  }, [localSelectedCollectionId, collectionId, documentsByCollection, dispatch]);
  
  // 🎯 CRITICAL FIX: Helper function to get document title without circular dependency
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
    
    // Fallback - don't check viewedDocuments to avoid circular dependency
    return `Document ${docId}`;
  }, [documentsByCollection, documents]); // 🎯 REMOVED viewedDocuments dependency
  
  // 🎯 CRITICAL FIX: Remove getDocumentTitle from dependency to prevent infinite loop
  useEffect(() => {
    if (documentId && collectionId) {
      const docId = Number(documentId);
      const colId = Number(collectionId);
      
      console.log('📄 Setting up initial document view:', { docId, colId });
      
      // 🎯 CRITICAL: Get title directly without relying on getDocumentTitle callback
      let initialTitle = `Document ${docId}`; // Fallback
      
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
  }, [documentId, collectionId, documentsByCollection, documents]); // 🎯 REMOVED getDocumentTitle

  // Sync viewedDocuments with comparisonDocumentId
  useEffect(() => {
    if (viewedDocuments.length === 2) {
      // We have a comparison document - update the comparison state
      const comparisonDoc = viewedDocuments[1]; // Second document is comparison
      console.log('📄 Setting comparison document ID to:', comparisonDoc.id);
      setComparisonDocumentId(comparisonDoc.id);
    } else if (viewedDocuments.length === 1) {
      // Back to single document - clear comparison state
      console.log('📄 Clearing comparison document ID');
      setComparisonDocumentId(null);
    }
  }, [viewedDocuments]);
  
  // 🎯 CRITICAL FIX: Handle scrolling with better timing and error handling
  useEffect(() => {
    if (pendingScrollTarget && viewedDocuments.some(doc => doc.id === pendingScrollTarget.documentId)) {
      console.log('🔄 Document loaded, executing pending scroll with allTargets:', pendingScrollTarget.allTargets?.length || 0);
      
      // Use a longer timeout and more robust checking
      const scrollTimeout = setTimeout(() => {
        try {
          // Check if the document content is actually rendered
          const documentPanel = document.querySelector(`[data-document-id="${pendingScrollTarget.documentId}"]`);
          if (documentPanel) {
            console.log('🔄 Document panel found, executing scroll');
            scrollToAndHighlightText(pendingScrollTarget.targetInfo, pendingScrollTarget.allTargets);
            setPendingScrollTarget(null);
          } else {
            console.warn('🔄 Document panel not found yet, will retry');
            // Retry after a longer delay
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
      }, 1500); // Increased from 1000ms to 1500ms
      
      return () => clearTimeout(scrollTimeout);
    }
  }, [pendingScrollTarget, viewedDocuments]);

  // 🎯 CRITICAL FIX: Atomic document addition with proper state management
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
    // 🎯 CRITICAL: Prevent concurrent updates
    if (isUpdatingDocuments.current) {
      console.log('➕ Document update already in progress, skipping');
      return;
    }
    
    isUpdatingDocuments.current = true;
    console.log('➕ === ADDING LINKED DOCUMENT AS SECONDARY ===');
    console.log('➕ Document ID:', linkedDocumentId, 'Collection ID:', linkedCollectionId);
    
    try {
      // Get the document title
      let linkedDocTitle = getDocumentTitle(linkedDocumentId, linkedCollectionId);
      console.log('➕ Initial document title:', linkedDocTitle);
      
      // If we don't have the document in our cache, fetch the collection
      if (linkedDocTitle.includes('Document ') && !documentsByCollection[linkedCollectionId]) {
        console.log('➕ === FETCHING COLLECTION FOR METADATA ===', linkedCollectionId);
        setIsLoadingDocuments(true);
        
        try {
          const payload = await dispatch(fetchDocumentsByCollection(linkedCollectionId)).unwrap();
          console.log('➕ Fetched collection documents:', payload.documents.map(d => ({ id: d.id, title: d.title })));
          
          // Update documents cache
          setDocumentsByCollection(prev => ({
            ...prev,
            [linkedCollectionId]: payload.documents.map(doc => ({
              id: doc.id,
              title: doc.title
            }))
          }));
          
          // Update the title with fresh data
          const freshDoc = payload.documents.find(d => d.id === linkedDocumentId);
          linkedDocTitle = freshDoc ? freshDoc.title : `Document ${linkedDocumentId}`;
          console.log('➕ Updated document title after fetch:', linkedDocTitle);
        } catch (error) {
          console.error('➕ Failed to fetch collection for linked document:', error);
          linkedDocTitle = `Document ${linkedDocumentId}`; // Fallback title
        } finally {
          setIsLoadingDocuments(false);
        }
      }
      
      console.log('➕ === ADDING DOCUMENT TO VIEWED LIST ===');
      // 🎯 CRITICAL FIX: Atomic state update
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
      // 🎯 CRITICAL: Always reset the update flag
      isUpdatingDocuments.current = false;
    }
  }, [dispatch, documentsByCollection, getDocumentTitle]);

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
    // 🎯 CRITICAL: Prevent concurrent updates
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
          
          // 🎯 CRITICAL FIX: Use element-based mapping to get correct title
          const elementBasedTitle = getElementBasedDocumentTitle(linkedDocumentId);
          linkedDocTitle = elementBasedTitle || getDocumentTitle(linkedDocumentId, linkedCollectionId);
        } catch (error) {
          console.error('🔄 Failed to fetch collection for linked document:', error);
          linkedDocTitle = `Document ${linkedDocumentId}`; // Fallback title
        } finally {
          setIsLoadingDocuments(false);
        }
      } else {
        // 🎯 CRITICAL FIX: Even if we have cache, use element-based mapping for accurate titles
        const elementBasedTitle = getElementBasedDocumentTitle(linkedDocumentId);
        if (elementBasedTitle) {
          linkedDocTitle = elementBasedTitle;
          console.log('🔄 Using element-based title:', linkedDocTitle);
        }
      }
      
      // 🎯 CRITICAL FIX: Atomic replacement
      const primaryDocument = viewedDocuments[0];
      
      setViewedDocuments([
        primaryDocument,
        {
          id: linkedDocumentId,
          collectionId: linkedCollectionId,
          title: linkedDocTitle
        }
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
      // 🎯 CRITICAL: Always reset the update flag
      isUpdatingDocuments.current = false;
    }
  }, [dispatch, documentsByCollection, getDocumentTitle, getElementBasedDocumentTitle, viewedDocuments, pendingScrollTarget]);
  
  // 🎯 CRITICAL FIX: Enhanced handleOpenLinkedDocument with better error handling and logging
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
    
    // 🎯 CRITICAL: Prevent multiple calls while updating
    if (isUpdatingDocuments.current) {
      console.log('🔗 ⚠️ Update already in progress, skipping call');
      return;
    }
    
    // Check if the document is already being viewed
    const isAlreadyViewed = viewedDocuments.some(doc => doc.id === linkedDocumentId);
    console.log('🔗 Document already viewed:', isAlreadyViewed);
    
    if (isAlreadyViewed) {
      // Document is already open, just scroll to the target text
      console.log('🔗 === SCROLLING TO EXISTING DOCUMENT ===');
      try {
        scrollToAndHighlightText(targetInfo, allTargets);
      } catch (error) {
        console.error('🔗 Error scrolling to existing document:', error);
      }
    } else {
      console.log('🔗 === OPENING NEW DOCUMENT ===');
      console.log('🔗 Current document count:', viewedDocuments.length);
      
      try {
        if (viewedDocuments.length === 1) {
          // Only one document open - add as secondary document
          console.log('🔗 === ADDING AS SECONDARY DOCUMENT ===');
          await addLinkedDocumentAsSecondary(linkedDocumentId, linkedCollectionId, targetInfo, allTargets);
        } else if (viewedDocuments.length === 2) {
          // Two documents open - replace the secondary document
          console.log('🔗 === REPLACING SECONDARY DOCUMENT ===');
          await replaceSecondaryDocument(linkedDocumentId, linkedCollectionId, targetInfo, allTargets);
        } else {
          console.warn('🔗 ⚠️ Unexpected document count:', viewedDocuments.length);
        }
      } catch (error) {
        console.error('🔗 Error opening linked document:', error);
      }
    }
    
    console.log('🔗 === DOCUMENT VIEWER: handleOpenLinkedDocument completed ===');
  }, [viewedDocuments, addLinkedDocumentAsSecondary, replaceSecondaryDocument]);

  // Handle comparison document changes from dropdown/selector
  const handleComparisonDocumentChange = useCallback(async (newComparisonDocumentId: number | null) => {
    console.log('⚖️ === COMPARISON DOCUMENT CHANGE ===');
    console.log('⚖️ New comparison document ID:', newComparisonDocumentId);
    
    if (newComparisonDocumentId === null) {
      // Remove comparison document - keep only primary
      setViewedDocuments(prev => prev.slice(0, 1));
      setComparisonDocumentId(null);
    } else {
      // Add or replace comparison document
      const primaryDocument = viewedDocuments[0];
      
      // Get document metadata
      let comparisonDocTitle = getDocumentTitle(newComparisonDocumentId, localSelectedCollectionId);
      
      // If we need to fetch collection data
      if (comparisonDocTitle.includes('Document ') && !documentsByCollection[localSelectedCollectionId]) {
        setIsLoadingDocuments(true);
        
        try {
          const payload = await dispatch(fetchDocumentsByCollection(localSelectedCollectionId)).unwrap();
          setDocumentsByCollection(prev => ({
            ...prev,
            [localSelectedCollectionId]: payload.documents.map(doc => ({
              id: doc.id,
              title: doc.title
            }))
          }));
          
          const freshDoc = payload.documents.find(d => d.id === newComparisonDocumentId);
          comparisonDocTitle = freshDoc ? freshDoc.title : `Document ${newComparisonDocumentId}`;
        } catch (error) {
          console.error('⚖️ Failed to fetch collection for comparison document:', error);
        } finally {
          setIsLoadingDocuments(false);
        }
      }
      
      // Update viewed documents
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
  }, [viewedDocuments, localSelectedCollectionId, documentsByCollection, dispatch, getDocumentTitle]);
  
  // Handle adding a document for comparison
  const handleAddComparisonDocument = useCallback((docId: number, docCollectionId: number) => {
    console.log('⚖️ Adding comparison document:', docId, 'from collection:', docCollectionId);
    handleComparisonDocumentChange(docId);
  }, [handleComparisonDocumentChange]);
  
  // Handle removing a document from comparison
  const handleRemoveDocument = useCallback((docId: number) => {
    setViewedDocuments(prev => prev.filter(doc => doc.id !== docId));
    
    // Clear pending scroll target if it's for the removed document
    if (pendingScrollTarget && pendingScrollTarget.documentId === docId) {
      setPendingScrollTarget(null);
    }
    
    // Update comparison state
    if (docId === comparisonDocumentId) {
      setComparisonDocumentId(null);
    }
    
    // If we're removing the main document, navigate back to documents list
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
        
        {/* Loading indicator for document operations */}
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
        
        {/* Document management panel with collapsible functionality */}
        <div className={`document-management-panel ${isManagementPanelCollapsed ? 'collapsed' : ''}`}>
          <div className="panel-header" onClick={toggleManagementPanel}>
            <h3>Document Comparison</h3>
            <button className="collapse-toggle" aria-label="Toggle panel">
              {isManagementPanelCollapsed ? '▼' : '▲'}
            </button>
          </div>
          
          {!isManagementPanelCollapsed && (
            <div className="panel-content">
              {/* View mode toggle buttons */}
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

              {/* Linking controls - only show when exactly 2 documents */}
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
                  
                  {/* Context menu usage hint */}
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
              
              {/* Viewed documents section with better indicators */}
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
              
              {/* Add document controls */}
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
                          handleAddComparisonDocument(selectedId, localSelectedCollectionId);
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
            </div>
          )}
        </div>
      </div>
      
      {/* Document content area */}
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

      {/* Document Linking Dialog */}
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