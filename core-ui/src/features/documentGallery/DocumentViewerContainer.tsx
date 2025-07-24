// src/features/documentGallery/DocumentViewerContainer.tsx

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

const DocumentViewerContainer: React.FC = () => {  
  return <RouterSwitchBoard />;
};

// Export these components so RouterSwitchBoard can use them
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

// Updated DocumentContentView component with linked document handling
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
        .catch(() => {
          setIsLoadingDocuments(false);
        });
    }
  }, [collectionId, dispatch]);
  
  // Fetch documents for the selected collection (if different from current)
  useEffect(() => {
    if (localSelectedCollectionId && localSelectedCollectionId !== Number(collectionId) && 
        !documentsByCollection[localSelectedCollectionId]) {
      
      setIsLoadingDocuments(true);
      
      dispatch(fetchDocumentsByCollection(localSelectedCollectionId))
        .unwrap()
        .then((payload) => {
          setDocumentsByCollection(prev => ({
            ...prev,
            [localSelectedCollectionId]: payload.documents.map(doc => ({
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
  }, [localSelectedCollectionId, collectionId, documentsByCollection, dispatch]);
  
  // Helper function to get document title
  const getDocumentTitle = (docId: number, docCollectionId: number): string => {
    // First try to find the document in our documentsByCollection cache
    const docInCache = documentsByCollection[docCollectionId]?.find(d => d.id === docId);
    
    // If not found, try to find it in the Redux store
    if (docInCache) {
      return docInCache.title;
    }
    
    const docInRedux = documents.find(d => d.id === docId);
    if (docInRedux) {
      return docInRedux.title;
    }
    
    // Fall back to a generic title
    return `Document ${docId}`;
  };
  
  // Set up initial document view when params change
  useEffect(() => {
    if (documentId && collectionId) {
      const docId = Number(documentId);
      const colId = Number(collectionId);
      
      setViewedDocuments([{
        id: docId,
        collectionId: colId,
        title: getDocumentTitle(docId, colId)
      }]);
    }
  }, [documentId, collectionId, documentsByCollection, documents]);
  
  // Handle scrolling to text when document is loaded - ENHANCED to support allTargets
  useEffect(() => {
    if (pendingScrollTarget && viewedDocuments.some(doc => doc.id === pendingScrollTarget.documentId)) {
      // Document is now loaded, scroll to the target text
      console.log('Executing pending scroll with allTargets:', pendingScrollTarget.allTargets?.length || 0);
      
      setTimeout(() => {
        scrollToAndHighlightText(pendingScrollTarget.targetInfo, pendingScrollTarget.allTargets);
        setPendingScrollTarget(null);
      }, 1000); // Wait for document content to render
    }
  }, [pendingScrollTarget, viewedDocuments]);
  
  // Handle opening a linked document - ENHANCED to support allTargets
  const handleOpenLinkedDocument = (
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
    console.log('handleOpenLinkedDocument called with allTargets:', allTargets?.length || 0);
    
    // Check if the document is already being viewed
    const isAlreadyViewed = viewedDocuments.some(doc => doc.id === linkedDocumentId);
    
    if (isAlreadyViewed) {
      // Document is already open, just scroll to the target text
      console.log('Document already viewed, scrolling immediately with allTargets:', allTargets?.length || 0);
      scrollToAndHighlightText(targetInfo, allTargets);
    } else {
      // Need to open the document first
      const linkedDocTitle = getDocumentTitle(linkedDocumentId, linkedCollectionId);
      
      // Add the document to viewed documents
      setViewedDocuments(prev => [...prev, {
        id: linkedDocumentId,
        collectionId: linkedCollectionId,
        title: linkedDocTitle
      }]);
      
      // Set up pending scroll target with allTargets
      console.log('Setting pending scroll target with allTargets:', allTargets?.length || 0);
      setPendingScrollTarget({
        documentId: linkedDocumentId,
        targetInfo,
        allTargets // CRUCIAL: Include allTargets in pending scroll
      });
    }
  };
  
  // Handle adding a document for comparison
  const handleAddComparisonDocument = (docId: number, docCollectionId: number) => {
    // Only add if not already being viewed
    if (!viewedDocuments.some(doc => doc.id === docId)) {
      setViewedDocuments(prev => [...prev, {
        id: docId,
        collectionId: docCollectionId,
        title: getDocumentTitle(docId, docCollectionId)
      }]);
    }
  };
  
  // Handle removing a document from comparison
  const handleRemoveDocument = (docId: number) => {
    setViewedDocuments(prev => prev.filter(doc => doc.id !== docId));
    
    // Clear pending scroll target if it's for the removed document
    if (pendingScrollTarget && pendingScrollTarget.documentId === docId) {
      setPendingScrollTarget(null);
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
                </div>
              )}
              
              {/* Viewed documents section */}
              <div className="viewed-documents">
                <h4>Currently Viewing:</h4>
                <ul className="document-list">
                  {viewedDocuments.map(doc => (
                    <li key={doc.id} className="document-item">
                      <span className="document-title">{doc.title}</span>
                      <button 
                        onClick={() => handleRemoveDocument(doc.id)}
                        className="remove-document-btn"
                        aria-label="Remove document"
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
                      value=""
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