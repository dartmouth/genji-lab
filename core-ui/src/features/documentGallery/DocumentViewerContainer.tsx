// src/DocumentViewerContainer.tsx
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "@store/hooks";
import { 
  setSelectedCollectionId, 
  fetchDocumentsByCollection,
  fetchDocumentCollections,
  selectAllDocuments,
  selectAllDocumentCollections // Uncommented this import
} from "@store";
import DocumentCollectionGallery from "@documentGallery/DocumentCollectionGallery";
import DocumentGallery from "@documentGallery/components/DocumentGallery";
import { DocumentComparisonContainer } from "@documentView";
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
      dispatch(setSelectedCollectionId(Number(collectionId)));
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

export const DocumentContentView: React.FC = () => {
  const { collectionId, documentId } = useParams<{ collectionId: string; documentId: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  
  // State to track the documents being viewed
  const [viewedDocuments, setViewedDocuments] = useState<Array<{id: number, collectionId: number}>>([]);
  
  // Track documents by collection to handle the API response structure
  const [documentsByCollection, setDocumentsByCollection] = useState<{
    [collectionId: number]: Array<{ id: number, title: string }>
  }>({});
  
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
    if (selectedCollectionId && selectedCollectionId !== Number(collectionId) && 
        !documentsByCollection[selectedCollectionId]) {
      
      setIsLoadingDocuments(true);
      
      dispatch(fetchDocumentsByCollection(selectedCollectionId))
        .unwrap()
        .then((payload) => {
          // Store the documents with their collection ID
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
  
  // Set up initial document view when params change
  useEffect(() => {
    if (documentId && collectionId) {
      setViewedDocuments([{
        id: Number(documentId),
        collectionId: Number(collectionId)
      }]);
    }
  }, [documentId, collectionId]);
  
  // Handle adding a document for comparison
  const handleAddComparisonDocument = (docId: number, docCollectionId: number) => {
    // Only add if not already being viewed
    if (!viewedDocuments.some(doc => doc.id === docId)) {
      setViewedDocuments(prev => [...prev, {
        id: docId,
        collectionId: docCollectionId
      }]);
    }
  };
  
  // Handle removing a document from comparison
  const handleRemoveDocument = (docId: number) => {
    setViewedDocuments(prev => prev.filter(doc => doc.id !== docId));
    
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
    setSelectedCollectionId(newCollectionId);
  };
  
  // Get available documents in the selected collection
  const availableInSelectedCollection = (documentsByCollection[selectedCollectionId] || [])
    .filter(doc => !viewedDocuments.some(viewedDoc => viewedDoc.id === doc.id));
  
  // Debug logs
  console.log('Documents by collection:', documentsByCollection);
  console.log('Selected collection ID:', selectedCollectionId);
  console.log('Available documents:', availableInSelectedCollection);
  
  return (
    <div className="document-content-view">
      <div className="document-view-header">
        <button 
          onClick={handleBackToDocuments}
          className="back-button"
        >
          ← Back to Documents
        </button>
        
        {/* Document management controls */}
        <div className="document-management-panel">
          <h3>Document Comparison</h3>
          
          {/* Currently viewed documents */}
          <div className="viewed-documents">
            <h4>Currently Viewing:</h4>
            <ul className="document-list">
              {viewedDocuments.map(doc => {
                // First try to find the document in our documentsByCollection cache
                let docDetails = documentsByCollection[doc.collectionId]?.find(d => d.id === doc.id);
                
                // If not found, try to find it in the Redux store
                if (!docDetails) {
                  const reduxDoc = documents.find(d => d.id === doc.id);
                  if (reduxDoc) {
                    docDetails = { id: reduxDoc.id, title: reduxDoc.title };
                  }
                }
                
                return (
                  <li key={doc.id} className="document-item">
                    <span className="document-title">{docDetails?.title || `Document ${doc.id}`}</span>
                    <button 
                      onClick={() => handleRemoveDocument(doc.id)}
                      className="remove-document-btn"
                      aria-label="Remove document"
                    >
                      ×
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
          
          {/* Add document controls (only show if fewer than 2 documents are being viewed) */}
          {viewedDocuments.length < 2 && (
            <div className="add-document-controls">
              <h4>Add Document for Comparison:</h4>
              
              {/* Collection selector */}
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
              
              {/* Document selector */}
              <div className="document-selector">
                <label htmlFor="document-select">Document:</label>
                <select 
                  id="document-select"
                  onChange={(e) => {
                    const selectedId = Number(e.target.value);
                    if (selectedId) {
                      handleAddComparisonDocument(
                        selectedId, 
                        selectedCollectionId
                      );
                    }
                  }}
                  value=""
                  className="document-select"
                  disabled={isLoadingDocuments || availableInSelectedCollection.length === 0}
                >
                  {isLoadingDocuments ? (
                    <option value="">Loading documents...</option>
                  ) : (
                    <>
                      <option value="">
                        {availableInSelectedCollection.length === 0 
                          ? "No other documents available" 
                          : "Select a document to compare"}
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
              
              {/* Debug info */}
              <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.5rem' }}>
                Collection: {selectedCollectionId} | 
                Documents: {documentsByCollection[selectedCollectionId]?.length || 0} | 
                Available: {availableInSelectedCollection.length}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Document content area */}
      {viewedDocuments.length > 0 ? (
        <DocumentComparisonContainer documents={viewedDocuments} />
      ) : (
        <div className="no-documents-message">
          No documents selected for viewing
        </div>
      )}
    </div>
  );
};

export default DocumentViewerContainer;