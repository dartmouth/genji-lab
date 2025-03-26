// AnnotationsSidebar.tsx
import React from 'react';
import AnnotationCard from './AnnotationCard';
import AnnotationCreationCard from './AnnotationCreationCard';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { Annotation } from '../types/annotation';
import './AnnotationsSidebar.css'; // We'll create this CSS file

type SidebarPosition = 'left' | 'right';

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
  position?: SidebarPosition; // New prop with default 'right'
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
  position = 'right', // Default to right if not specified
}) => {
  // Determine which icon to show based on position and collapsed state
  const renderToggleIcon = () => {
    if (position === 'right') {
      return collapsedComments ? <FaChevronRight /> : <FaChevronLeft />;
    } else {
      return collapsedComments ? <FaChevronLeft /> : <FaChevronRight />;
    }
  };

  return (
    <div className={`sidebar position-${position}`}>
      <div 
        className={`annotations-panel ${collapsedComments ? 'open' : 'closed'} position-${position}`} 
        style={{ 
          flex: collapsedComments ? 1 : 0,
          width: collapsedComments ? 'auto' : '0',
          overflow: 'hidden',
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
      
      <div className={`sidebar-controls position-${position}`}>
        <button 
          className="sidebar-toggle-button"
          onClick={() => setCollapsedComments(!collapsedComments)}
          aria-label={collapsedComments ? "Hide comments" : "Show comments"}
        >
          {renderToggleIcon()}
        </button>
      </div>
    </div>
  );
};

export default AnnotationsSidebar;