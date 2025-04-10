import React, { useEffect } from "react";
import { useNavigate, useParams, Routes, Route, Navigate } from "react-router-dom";
import { useAppDispatch } from "@store/hooks";
import { setSelectedCollectionId } from "@store";
import DocumentCollectionGallery from "@documentGallery/DocumentCollectionGallery";
import DocumentGallery from "@documentGallery/components/DocumentGallery";
import { DocumentContentPanel } from "@documentView";

const DocumentViewerContainer: React.FC = () => {  
  // Container component now just sets up the routes
  return (
    <Routes>
      <Route path="/" element={<CollectionsView />} />
      <Route path="/collections/:collectionId" element={<DocumentsView />} />
      <Route path="/collections/:collectionId/documents/:documentId" element={<DocumentContentView />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

// Separate components for each route
const CollectionsView: React.FC = () => {
  const navigate = useNavigate();
  
  const handleCollectionSelect = (collectionId: number) => {
    navigate(`/collections/${collectionId}`);
  };
  
  return <DocumentCollectionGallery onCollectionSelect={handleCollectionSelect} />;
};

const DocumentsView: React.FC = () => {
  const { collectionId } = useParams<{ collectionId: string }>();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (collectionId) {
      dispatch(setSelectedCollectionId(Number(collectionId)));
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

const DocumentContentView: React.FC = () => {
  const { collectionId, documentId } = useParams<{ collectionId: string; documentId: string }>();
  const navigate = useNavigate();
  
  const handleBackToDocuments = () => {
    navigate(`/collections/${collectionId}`);
  };
  
  return (
    <>
      <button 
        onClick={handleBackToDocuments}
        className="back-button"
        style={{ margin: '1rem' }}
      >
        ← Back to Documents
      </button>
      {collectionId && documentId && (
        <DocumentContentPanel
          documentCollectionId={Number(collectionId)}
          documentID={Number(documentId)}
        />
      )}
    </>
  );
};

export default DocumentViewerContainer;