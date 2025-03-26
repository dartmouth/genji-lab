// AnnotationsSidebar.tsx
import React from 'react';
import AnnotationCard from './AnnotationCard';
import AnnotationCreationCard from './AnnotationCreationCard';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { Annotation } from '../types/annotation'; // You'll need to import your annotation type

interface AnnotationsSidebarProps {
  collapsedComments: boolean;
  setCollapsedComments: (collapsed: boolean) => void;
  selectionInfo: {
    content_id: number;
    start: number;
    end: number;
    text: string;
  };
  newAnnotationText: string;
  setNewAnnotationText: (text: string) => void;
  handleCreateAnnotation: () => void;
  handleCancelAnnotation: () => void;
  hoveredAnnotations: Annotation[];
}

const AnnotationsSidebar: React.FC<AnnotationsSidebarProps> = ({
  collapsedComments,
  setCollapsedComments,
  selectionInfo,
  newAnnotationText,
  setNewAnnotationText,
  handleCreateAnnotation,
  handleCancelAnnotation,
  hoveredAnnotations,
}) => {
  return (
    <>
      <div 
        className={`annotations-panel ${collapsedComments ? 'open' : 'closed'}`} 
        style={{ 
          flex: collapsedComments ? 1 : 0,
          width: collapsedComments ? 'auto' : '0',
          overflow: 'hidden',
          transition: 'all 0.3s ease-in-out'
        }}
      >
        {selectionInfo.text && (
          <AnnotationCreationCard
            selectedText={selectionInfo.text}
            annotationText={newAnnotationText}
            onAnnotationTextChange={setNewAnnotationText}
            onSave={handleCreateAnnotation}
            onCancel={handleCancelAnnotation}
          />
        )}
        
        {
          hoveredAnnotations.length === 0 ? (
            !selectionInfo.text && <p>Hover over a highlight to view annotations</p>
          ) : (
            hoveredAnnotations.map(annotation => (
              <AnnotationCard
                key={annotation.id}
                id={`${annotation.id}`}
                annotation={annotation}
                isHighlighted={false}
              />
            ))
          )
        }
      </div>
      
      <div className="sidebar-controls">
        <button 
          className="sidebar-toggle-button"
          onClick={() => setCollapsedComments(!collapsedComments)}
          aria-label={collapsedComments ? "Show comments" : "Hide comments"}
        >
          {collapsedComments ? <FaChevronLeft /> : <FaChevronRight />}
        </button>
      </div>
    </>
  );
};

export default AnnotationsSidebar;