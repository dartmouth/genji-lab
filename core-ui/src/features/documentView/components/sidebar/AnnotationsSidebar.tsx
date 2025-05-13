import React from 'react';
import { AnnotationCard } from '@documentView/components';
import { AnnotationCreationCard} from '.';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { Annotation } from '@documentView/types';
import '@documentView/styles/AnnotationsSidebar.css'; 
import { useAppSelector, selectMotivation } from '@store';

type SidebarPosition = 'left' | 'right';

interface AnnotationsSidebarProps {
  collapsedComments: boolean;
  setCollapsedComments: (collapsed: boolean) => void;
  hoveredAnnotations: Annotation[];
  motivation: string;
  position?: SidebarPosition;
  documentId: number; // Added documentId prop
}

const AnnotationsSidebar: React.FC<AnnotationsSidebarProps> = ({
  collapsedComments,
  setCollapsedComments,
  hoveredAnnotations,
  motivation,
  position = 'right',
  documentId // Include in props destructuring
}) => {
  const currentMotivation = useAppSelector(selectMotivation);
  
  // Filter annotations by document ID
  const filteredAnnotations = hoveredAnnotations.filter(
    annotation => !documentId || annotation.document_id === documentId
  );

  // Determine which icon to show based on position and collapsed state
  const renderToggleIcon = () => {
    if (position === 'right') {
      return collapsedComments ? <FaChevronRight /> : <FaChevronLeft />;
    } else {
      return collapsedComments ? <FaChevronLeft /> : <FaChevronRight />;
    }
  };

  // Add this to your AnnotationsSidebar component
console.log(`AnnotationsSidebar (${motivation}) render:`, {
  position, 
  collapsedComments, 
  hoveredAnnotations: hoveredAnnotations.length,
});

// Also add this to your toggle button click handler
console.log(`Toggle clicked in ${motivation} sidebar. Current: ${collapsedComments}, Will be: ${!collapsedComments}`);

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
        {/* Show document indicator if we have annotations */}
        {filteredAnnotations.length > 0 && (
          <div className="document-indicator">
            Showing annotations for document #{documentId}
          </div>
        )}
        
        {currentMotivation === motivation && (
          <AnnotationCreationCard/>
        )}
        
        {
          filteredAnnotations.length === 0 ? (
            <p>{`Hover over a highlight to view ${motivation === 'commenting' ? 'comments': 'annotations'}`}</p>
          ) : (
            filteredAnnotations.filter(anno => anno && anno.id).map(annotation => (
              <AnnotationCard
                key={annotation.id}
                id={`${annotation.id}`}
                annotation={annotation}
                isHighlighted={false}
                depth={0}
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