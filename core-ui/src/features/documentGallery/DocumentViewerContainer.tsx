import React, { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAppDispatch } from "@store/hooks";
import { setSelectedCollectionId } from "@store";
import DocumentCollectionGallery from "@documentGallery/DocumentCollectionGallery";
import DocumentGallery from "@documentGallery/components/DocumentGallery";
import { DocumentContentPanel } from "@documentView";
import RouterSwitchBoard from "@/RouterSwitchBoard";

const DocumentViewerContainer: React.FC = () => {  
  return <RouterSwitchBoard />;
};

// Export these components so RouterSwitchBoard can use them
export const CollectionsView: React.FC = () => {
  const navigate = useNavigate();
  
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
  const { collectionId } = useParams<{ collectionId: string }>();
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
      <DocumentContentPanel />
    </>
  );
};

export default DocumentViewerContainer;