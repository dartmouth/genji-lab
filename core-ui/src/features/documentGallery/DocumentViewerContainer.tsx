// src/features/documentGallery/DocumentViewerContainer.tsx
// FIXED VERSION - Proper exports and structure

import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "@store/hooks";
import { 
  setSelectedCollectionId as setReduxSelectedCollectionId, 
  fetchDocumentsByCollection,
  fetchDocumentCollections,
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

// 🎯 FIXED: Main document content view component - NOW PROPERLY EXPORTED
export const DocumentContentView: React.FC = () => {
  const { collectionId, documentId } = useParams<{ collectionId: string; documentId: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  
  // State to track the documents being viewed - NOW INCLUDES TITLE
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
  
  // State to track pending scroll target (for when a document is opened via linked text)
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
  
  // State for document selection dropdown - renamed to avoid conflicts
  const [localSelectedCollectionId, setLocalSelectedCollectionId] = useState<number>(Number(collectionId));
  
  // State for management panel collapse
  const [isManagementPanelCollapsed, setIsManagementPanelCollapsed] = useState(true);
  
  // State for view mode (reading vs annotations)
  const [viewMode, setViewMode] = useState<'reading' | 'annotations'>('reading');
  
  // State for showing linked text highlights
  const [showLinkedTextHighlights, setShowLinkedTextHighlights] = useState(false);

  // 🎯 NEW: State to track if we're in comparison mode
  const [comparisonDocumentId, setComparisonDocumentId] = useState<number | null>(null);
  
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
  
  // ENHANCED: Helper function to get document title with better caching
  const getDocumentTitle = (docId: number, docCollectionId: number): string => {
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
    
    // Method 3: Check currently viewed documents
    const viewedDoc = viewedDocuments.find(d => d.id === docId);
    if (viewedDoc) {
      return viewedDoc.title;
    }
    
    // Fallback
    return `Document ${docId}`;
  };
  
  // Set up initial document view when params change
  useEffect(() => {
    if (documentId && collectionId) {
      const docId = Number(documentId);
      const colId = Number(collectionId);
      
      console.log('📄 Setting up initial document view:', { docId, colId });
      
      setViewedDocuments([{
        id: docId,
        collectionId: colId,
        title: getDocumentTitle(docId, colId)
      }]);
      
      // Reset comparison state
      setComparisonDocumentId(null);
    }
  }, [documentId, collectionId, documentsByCollection, documents]);

  // 🎯 NEW: Sync viewedDocuments with comparisonDocumentId
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
  
  // Handle scrolling to text when document is loaded - ENHANCED to support allTargets
  useEffect(() => {
    if (pendingScrollTarget && viewedDocuments.some(doc => doc.id === pendingScrollTarget.documentId)) {
      // Document is now loaded, scroll to the target text
      console.log('🔄 Executing pending scroll with allTargets:', pendingScrollTarget.allTargets?.length || 0);
      
      setTimeout(() => {
        scrollToAndHighlightText(pendingScrollTarget.targetInfo, pendingScrollTarget.allTargets);
        setPendingScrollTarget(null);
      }, 1000); // Wait for document content to render
    }
  }, [pendingScrollTarget, viewedDocuments]);
  
  // 🎯 ENHANCED: Handle opening a linked document with proper comparison mode integration
  const handleOpenLinkedDocument = async (
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
    
    // Check if the document is already being viewed
    const isAlreadyViewed = viewedDocuments.some(doc => doc.id === linkedDocumentId);
    console.log('🔗 Document already viewed:', isAlreadyViewed);
    
    if (isAlreadyViewed) {
      // Document is already open, just scroll to the target text
      console.log('🔗 === SCROLLING TO EXISTING DOCUMENT ===');
      scrollToAndHighlightText(targetInfo, allTargets);
    } else {
      console.log('🔗 === OPENING NEW DOCUMENT ===');
      console.log('🔗 Current document count:', viewedDocuments.length);
      
      if (viewedDocuments.length === 1) {
        // Only one document open - add as secondary document
        console.log('🔗 === ADDING AS SECONDARY DOCUMENT ===');
        await addLinkedDocumentAsSecondary(linkedDocumentId, linkedCollectionId, targetInfo, allTargets);
      } else if (viewedDocuments.length === 2) {
        // Two documents open - replace the secondary document
        console.log('🔗 === REPLACING SECONDARY DOCUMENT ===');
        await replaceSecondaryDocument(linkedDocumentId, linkedCollectionId, targetInfo, allTargets);
      }
    }
    
    console.log('🔗 === DOCUMENT VIEWER: handleOpenLinkedDocument completed ===');
  };
  
  // NEW: Helper function to add a linked document as secondary
  const addLinkedDocumentAsSecondary = async (
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
    console.log('➕ === ADDING LINKED DOCUMENT AS SECONDARY ===');
    console.log('➕ Document ID:', linkedDocumentId, 'Collection ID:', linkedCollectionId);
    
    // First, ensure we have the document metadata
    let linkedDocTitle = getDocumentTitle(linkedDocumentId, linkedCollectionId);
    console.log('➕ Initial document title:', linkedDocTitle);
    
    // If we don't have the document in our cache, fetch the collection
    if (linkedDocTitle.includes('Document ') && !documentsByCollection[linkedCollectionId]) {
      console.log('➕ === FETCHING COLLECTION FOR METADATA ===', linkedCollectionId);
      setIsLoadingDocuments(true);
      
      try {
        const payload = await dispatch(fetchDocumentsByCollection(linkedCollectionId)).unwrap();
        console.log('➕ Fetched collection documents:', payload.documents.map(d => ({ id: d.id, title: d.title })));
        
        setDocumentsByCollection(prev => ({
          ...prev,
          [linkedCollectionId]: payload.documents.map(doc => ({
            id: doc.id,
            title: doc.title
          }))
        }));
        
        // Update the title with fresh data
        linkedDocTitle = getDocumentTitle(linkedDocumentId, linkedCollectionId);
        console.log('➕ Updated document title after fetch:', linkedDocTitle);
      } catch (error) {
        console.error('➕ Failed to fetch collection for linked document:', error);
      } finally {
        setIsLoadingDocuments(false);
      }
    }
    
    console.log('➕ === ADDING DOCUMENT TO VIEWED LIST ===');
    // Add the document to viewed documents
    setViewedDocuments(prev => {
      const newDoc = {
        id: linkedDocumentId,
        collectionId: linkedCollectionId,
        title: linkedDocTitle
      };
      console.log('➕ Adding document:', newDoc);
      console.log('➕ Previous viewed documents:', prev.map(d => ({ id: d.id, title: d.title })));
      const newList = [...prev, newDoc];
      console.log('➕ New viewed documents:', newList.map(d => ({ id: d.id, title: d.title })));
      return newList;
    });
    
    // Set up pending scroll target
    console.log('➕ === SETTING PENDING SCROLL TARGET ===');
    setPendingScrollTarget({
      documentId: linkedDocumentId,
      targetInfo,
      allTargets
    });
  };
  
  // NEW: Helper function to replace the secondary document
  const replaceSecondaryDocument = async (
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
    console.log('🔄 Replacing secondary document with:', linkedDocumentId);
    
    // First, ensure we have the document metadata
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
        
        // Update the title with fresh data
        linkedDocTitle = getDocumentTitle(linkedDocumentId, linkedCollectionId);
      } catch (error) {
        console.error('🔄 Failed to fetch collection for linked document:', error);
      } finally {
        setIsLoadingDocuments(false);
      }
    }
    
    // Replace the secondary document (keep the first, replace the second)
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
  };

  // 🎯 NEW: Handle comparison document changes from dropdown/selector
  const handleComparisonDocumentChange = async (newComparisonDocumentId: number | null) => {
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
          
          comparisonDocTitle = getDocumentTitle(newComparisonDocumentId, localSelectedCollectionId);
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
  };
  
  // Handle adding a document for comparison - UPDATED to use new system
  const handleAddComparisonDocument = (docId: number, docCollectionId: number) => {
    console.log('⚖️ Adding comparison document:', docId, 'from collection:', docCollectionId);
    handleComparisonDocumentChange(docId);
  };
  
  // Handle removing a document from comparison
  const handleRemoveDocument = (docId: number) => {
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
  };
  
  // Handle back button
  const handleBackToDocuments = () => {
    navigate(`/collections/${collectionId}`);
  };
  
  // Handle collection selection change
  const handleCollectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCollectionId = Number(e.target.value);
    setLocalSelectedCollectionId(newCollectionId);
  };
  
  // Toggle management panel collapsed state
  const toggleManagementPanel = () => {
    setIsManagementPanelCollapsed(!isManagementPanelCollapsed);
  };
  
  // Handle view mode change
  const handleViewModeChange = (mode: 'reading' | 'annotations') => {
    setViewMode(mode);
  };
  
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
        
        {/* ENHANCED: Add loading indicator for document operations */}
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
                  
                  {/* ENHANCED: Context menu usage hint */}
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
              
              {/* ENHANCED: Viewed documents section with better indicators */}
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
                        disabled={index === 0 && viewedDocuments.length === 1} // Can't remove last document
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