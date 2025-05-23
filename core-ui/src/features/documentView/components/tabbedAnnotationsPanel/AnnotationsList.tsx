import React from 'react';
import { Annotation } from "@documentView/types/annotation";
import AnnotationCard from '../annotationCard/AnnotationCard';

export type PanelPosition = 'bottom' | 'right' | 'left';

export interface AnnotationsListProps {
  annotations: Annotation[];
  position: PanelPosition;
  isHovering: boolean;
  activeTab: string;
  documents: Array<{
    id: number;
    title: string;
    color?: string;
  }>;
  getDocumentTitle: (docId: number) => string;
}

const AnnotationsList: React.FC<AnnotationsListProps> = ({
  annotations,
  position,
  isHovering,
  activeTab,
  documents,
  getDocumentTitle
}) => {

  if (annotations.length === 0) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: '#6c757d',
        fontSize: '14px',
        textAlign: 'center',
        padding: '20px'
      }}>
        {isHovering 
          ? "Hover over highlighted text to view annotations" 
          : `No annotations found for ${activeTab === 'all' ? 'any document' : getDocumentTitle(Number(activeTab.replace('doc-', '')))}`
        }
      </div>
    );
  }

  return (
    <div style={{
      display: 'grid',
      gap: '12px',
      gridTemplateColumns: position === 'bottom' ? 'repeat(auto-fill, minmax(300px, 1fr))' : '1fr'
    }}>
      {annotations.map(annotation => {
        // Get the document info for this annotation
        const document = documents.find(doc => doc.id === annotation.document_id);
        const documentColor = document?.color || '#6c757d';
        const documentTitle = document?.title || getDocumentTitle(annotation.document_id);
        
        return (
          <AnnotationCard
            key={annotation.id}
            id={annotation.id}
            annotation={annotation}
            isHighlighted={false}
            depth={0}
            documentColor={documentColor}
            documentTitle={documentTitle}
            showDocumentInfo={activeTab === 'all'}
          />
        );
      })}
    </div>
  );
};

export default AnnotationsList;