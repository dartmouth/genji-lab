import React, { useState, useEffect } from "react";
import { useAppSelector, useAppDispatch } from "@store/hooks";
import { 
  selectAllDocuments, 
  selectDocumentsStatus, 
  selectAllDocumentCollections,
  fetchDocumentsByCollection,
  selectSelectedCollectionId
} from "@store";

interface DocumentComparisonSelectorProps {
  collectionId: number;
  currentDocumentId: number;
  onCompareDocument: (documentId: number | null) => void;
  comparisonDocumentId: number | null;
}

const DocumentComparisonSelector: React.FC<DocumentComparisonSelectorProps> = ({
  collectionId,
  currentDocumentId,
  onCompareDocument,
  comparisonDocumentId
}) => {
  const dispatch = useAppDispatch();
  const [showCompareSelector, setShowCompareSelector] = useState(!!comparisonDocumentId);
  const [selectedCollectionId, setSelectedCollectionId] = useState<number>(collectionId);
  
  // Get all documents and document collections
  const documents = useAppSelector(selectAllDocuments);
  const documentsStatus = useAppSelector(selectDocumentsStatus);
  const documentCollections = useAppSelector(selectAllDocumentCollections);
  const storeSelectedCollectionId = useAppSelector(selectSelectedCollectionId);
  
  // When the selected collection changes, fetch its documents
  useEffect(() => {
    if (selectedCollectionId) {
      console.log(`DocumentComparisonSelector: Fetching documents for collection ${selectedCollectionId}`);
      dispatch(fetchDocumentsByCollection(selectedCollectionId));
    }
  }, [selectedCollectionId, dispatch]);
  
  // Filter documents - consider ALL documents from the current fetch as belonging to the selected collection
  // This works around the missing document_collection_id field
  const compareDocuments = documents.filter(doc => {
    // Skip only the current document
    return doc.id !== currentDocumentId;
  });
  
  // Handle document selection
  const handleDocumentSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === "") {
      onCompareDocument(null);
    } else {
      onCompareDocument(Number(value));
    }
  };
  
  // Handle collection selection
  const handleCollectionSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCollectionId = Number(e.target.value);
    console.log(`Selecting collection: ${newCollectionId}`);
    setSelectedCollectionId(newCollectionId);
    // Clear any selected comparison document when changing collections
    onCompareDocument(null);
  };
  
  // Handle toggle compare view
  const handleToggleCompare = () => {
    setShowCompareSelector(!showCompareSelector);
    if (showCompareSelector && comparisonDocumentId) {
      // If we're hiding the selector and there's a comparison document, clear it
      onCompareDocument(null);
    }
  };
  
  return (
    <div className="document-compare-selector">
      <button 
        onClick={handleToggleCompare}
        className="compare-toggle-button"
      >
        {!showCompareSelector ? 'Compare with Document' : 'Hide Compare View'}
      </button>
      
      {showCompareSelector && (
        <div className="document-selector-controls">
          {/* Collection selector */}
          <div className="collection-selector-dropdown">
            <select 
              value={selectedCollectionId || ''}
              onChange={handleCollectionSelect}
              className="collection-select"
            >
              <option value="">Select a collection</option>
              {documentCollections && documentCollections.length > 0 ? (
                documentCollections.map(collection => (
                  <option key={collection.id} value={collection.id}>
                    {collection.title}
                  </option>
                ))
              ) : (
                <option value="" disabled>No collections available</option>
              )}
            </select>
          </div>
          
          {/* Document selector */}
          <div className="document-selector-dropdown">
            <select 
              value={comparisonDocumentId || ''}
              onChange={handleDocumentSelect}
              className="document-select"
              disabled={documentsStatus === 'loading' || compareDocuments.length === 0}
            >
              {documentsStatus === 'loading' ? (
                <option value="">Loading documents...</option>
              ) : (
                <>
                  <option value="">
                    {compareDocuments.length === 0 
                      ? "No other documents in this collection" 
                      : "Select a document to compare"}
                  </option>
                  {compareDocuments.map(doc => (
                    <option key={doc.id} value={doc.id}>
                      {doc.title || `Document ${doc.id}`}
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>
          
          {/* Debug info */}
          <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#666' }}>
            Selected Collection: {selectedCollectionId} | 
            Store Collection: {storeSelectedCollectionId} |
            Documents: {documents.length} | 
            Available: {compareDocuments.length}
          </div>
          
          {/* Show document details for debugging */}
          <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', background: '#f5f5f5', padding: '0.5rem', borderRadius: '4px' }}>
            <div><strong>Documents in Store:</strong></div>
            {documents.map(doc => (
              <div key={doc.id}>
                ID: {doc.id} | Title: {doc.title} | Collection: {doc.document_collection_id || '(missing)'}
                {doc.id === currentDocumentId && " (current)"}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentComparisonSelector;