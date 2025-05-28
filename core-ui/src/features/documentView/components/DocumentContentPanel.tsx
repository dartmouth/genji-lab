import React, { useEffect } from 'react';
import { 
  HighlightedText,
  MenuContext
} from '.';
import { 
  RootState, 
  fetchDocumentElements,
  selectElementsByDocumentId,
  selectDocumentStatusById,
  selectDocumentErrorById
} from '@store';
import { useSelector } from 'react-redux';
import { useAppDispatch } from '@store/hooks';
import '../styles/DocumentContentStyles.css';
import { DocumentElement } from '@documentView/types';

interface DocumentContentPanelProps {
  documentId: number;
  documentCollectionId: number;
}

const DocumentContentPanel: React.FC<DocumentContentPanelProps> = ({
  documentId,
  documentCollectionId
}) => {
  // Redux
  const dispatch = useAppDispatch();
  
  const documentElements = useSelector((state: RootState) => 
    selectElementsByDocumentId(state, documentId)
  ) as DocumentElement[];
  
  const documentStatus = useSelector((state: RootState) => 
    selectDocumentStatusById(state, documentId)
  );
  
  const documentError = useSelector((state: RootState) => 
    selectDocumentErrorById(state, documentId)
  );
  
  // Fetch document elements
  useEffect(() => {
    if (documentId) {
      dispatch(fetchDocumentElements(documentId));
    }
  }, [dispatch, documentId]);
  
  // Loading/Error states
  if (documentStatus === 'loading' && documentElements.length === 0) {
    return <div className="loading-indicator">Loading document elements...</div>;
  }
  
  if (documentStatus === 'failed') {
    return (
      <div className="error-message">
        Error loading document: {documentError}
        <br />
        <button 
          onClick={() => dispatch(fetchDocumentElements(documentId))}
          className="retry-button"
        >
          Retry
        </button>
      </div>
    );
  }
  
  if (!documentElements || documentElements.length === 0) {
    return (
      <div className="warning-message">
        <p>No content found for this document.</p>
        <p>The document may be empty or still loading.</p>
        <button 
          onClick={() => dispatch(fetchDocumentElements(documentId))}
          className="retry-button"
        >
          Retry Loading
        </button>
      </div>
    );
  }

  return (
    <div className="document-panel">
      <div className="document-content-container">
        {documentElements.map((content) => {
          const paragraphId = `DocumentElements/${content.id}`;
          return (
            <div 
              key={content.id} 
              className="document-content"
              id={paragraphId}
            >
              <HighlightedText
                text={content.content.text}
                paragraphId={paragraphId}
                documentCollectionId={documentCollectionId}
                documentId={documentId}
              />
            </div>
          );
        })}
        
        <MenuContext/>
      </div>
    </div>
  );
};

export default DocumentContentPanel;