// src/features/documentView/components/tabbedAnnotationsPanel/AnnotationsList.tsx - Fixed Grid Spacing
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
      gap: position === 'bottom' ? '40px' : '12px', 
      gridTemplateColumns: position === 'bottom' 
        ? 'repeat(auto-fill, minmax(340px, 1fr))' 
        : '1fr',
      padding: position === 'bottom' ? '0 16px 16px 16px' : '0', 
      width: '100%',
      boxSizing: 'border-box'
    }}>
      {annotations.map(annotation => {
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
            position={position}
          />
        );
      })}
    </div>
  );
};

export default AnnotationsList;