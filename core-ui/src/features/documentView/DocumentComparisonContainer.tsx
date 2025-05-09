// src/documentView/DocumentComparisonContainer.tsx
import React from 'react';
import { DocumentContentPanel } from '.';
import './styles/DocumentComparisonStyles.css';

interface DocumentComparisonContainerProps {
  documents: Array<{
    id: number;
    collectionId: number;
  }>;
}

const DocumentComparisonContainer: React.FC<DocumentComparisonContainerProps> = ({
  documents
}) => {
  // Determine layout based on number of documents
  const layoutClass = documents.length > 1 ? 'multi-document-layout' : 'single-document-layout';
  
  return (
    <div className={`document-comparison-container ${layoutClass}`}>
      {documents.map((doc, index) => (
        <div 
          key={doc.id} 
          className={`document-panel-wrapper panel-${index}`}
        >
          <DocumentContentPanel
            documentId={doc.id}
            documentCollectionId={doc.collectionId}
            showAnnotations={documents.length === 1} // Only show annotations for single document view
          />
        </div>
      ))}
      
      {/* Shared annotation panel for multi-document view */}
      {documents.length > 1 && (
        <div className="shared-annotation-panel">
          {/* You can implement shared annotations here if needed */}
        </div>
      )}
    </div>
  );
};

export default DocumentComparisonContainer;