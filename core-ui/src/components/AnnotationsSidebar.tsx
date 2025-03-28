import React from 'react';
import AnnotationCard from './AnnotationCard';
import AnnotationCreationCard from './AnnotationCreationCard';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { Annotation } from '../types/annotation';
import '../styles/AnnotationsSidebar.css'; 
import { useAppSelector } from '../store/hooks/useAppDispatch';
import { selectMotivation } from '../slice/annotationCreate'
type SidebarPosition = 'left' | 'right';

interface AnnotationsSidebarProps {
  collapsedComments: boolean;
  setCollapsedComments: (collapsed: boolean) => void;
  hoveredAnnotations: Annotation[];
  motivation: string
  position?: SidebarPosition;
}

const AnnotationsSidebar: React.FC<AnnotationsSidebarProps> = ({
  collapsedComments,
  setCollapsedComments,
  hoveredAnnotations,
  motivation,
  position = 'right'
}) => {

  const currentMotivation = useAppSelector(selectMotivation)

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
        {currentMotivation === motivation && (
          <AnnotationCreationCard/>
        )}
        
        {
          hoveredAnnotations.length === 0 ? (
            <p>{`Hover over a highlight to view ${motivation === 'commenting' ? 'comments': 'annotations'}`}</p>
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