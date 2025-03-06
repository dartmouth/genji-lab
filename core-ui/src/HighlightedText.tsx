// components/HighlightedText.tsx
import React, { useRef, useEffect, useState } from 'react';
import { Annotation } from './types/annotation'; // Assuming you've moved the Annotation interface to a types file


interface HighlightProps {
  annotation: Annotation;
  position: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}



const Highlight: React.FC<HighlightProps> = ({ position, onMouseEnter, onMouseLeave }) => {
  return (
    <div
      style={{
        position: 'absolute',
        backgroundColor: 'yellow',
        opacity: 0.5,
        left: `${position.left}px`,
        top: `${position.top}px`,
        width: `${position.width}px`,
        height: `${position.height}px`,
        pointerEvents: 'all', // Changed to 'all' to capture mouse events
        userSelect: 'none',
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    />
  );
};

interface SelectedTextInterface {
  content_id: string;
  start: number;
  end: number;
  text: string;
  
}

interface HighlightedTextProps {
  text: string;
  annotations: Annotation[];
  paragraphId: string;
  // add prop that is a function to set selected text state in parent component
  setSelectedText: (selectedText: SelectedTextInterface) => void;
  onHighlightHover?: (annotationId: string | null, isHovering: boolean) => void;
}


const HighlightedText: React.FC<HighlightedTextProps> = ({
  text,
  annotations,
  paragraphId,
  setSelectedText,
  onHighlightHover = () => {},
}) => {

  const containerRef = useRef<HTMLDivElement>(null);
  const [highlightPositions, setHighlightPositions] = useState<Map<string, Array<{ left: number; top: number; width: number; height: number }>>>(
    new Map()
  );

  // Calculate highlight positions
  const calculateHighlightPositions = () => {
    if (!containerRef.current) return;

    const textNode = containerRef.current.firstChild;
    if (!textNode || !(textNode instanceof Text)) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const newPositions = new Map<string, Array<{ left: number; top: number; width: number; height: number }>>();

    annotations.forEach((annotation) => {
      // Find annotations that target this paragraph
      const target = annotation.target.find((t) => 
        t.source === paragraphId || t.id.includes(paragraphId)
      );
      
      if (!target) return;

      try {
        const { start, end } = target.selector.refinedBy;
        const range = document.createRange();
        
        range.setStart(textNode, start);
        range.setEnd(textNode, end);
        
        const rects = Array.from(range.getClientRects());
        const positions = rects.map((rect) => ({
          left: rect.left - containerRect.left,
          top: rect.top - containerRect.top,
          width: rect.width,
          height: rect.height,
        }));
        
        newPositions.set(annotation.id, positions);
      } catch (error) {
        console.error('Error calculating highlight position:', error);
      }
    });

    setHighlightPositions(newPositions);
  };

  // Recalculate on component mount and when annotations or text changes
  useEffect(() => {
    calculateHighlightPositions();
    
    // Set up resize observer
    const resizeObserver = new ResizeObserver(() => {
      calculateHighlightPositions();
    });
    
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    
    // Clean up
    return () => {
      resizeObserver.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [annotations, text, paragraphId]);

  const handleMouseUp = () => {
    const selection = window.getSelection();
    if (!selection) return;
    const range = selection.getRangeAt(0);
    if (!range) return;
    
    // Only process if there's actually text selected
    if (selection.toString().trim().length === 0) return;
    
    // Get all paragraphs in the selection
    const startContainerParent = range.startContainer.parentElement;
    const startParagraph = startContainerParent ? startContainerParent.closest('.annotatable-paragraph') : null;
    if (!startParagraph) return;
    const newSelectionInfo = {
      content_id: startParagraph.id,
      start: range.startOffset,
      end: range.endOffset,
      text: selection.toString()
    };
    setSelectedText(newSelectionInfo)
    // console.log(selectionInfo);
  };

  return (
    <div 
      id={
        paragraphId
      }
      ref={containerRef} 
      className="annotatable-paragraph"
      onMouseUp={handleMouseUp}
      style={{ position: 'relative' }}
    >
      {text}
      
      {/* Render highlight containers */}
      {Array.from(highlightPositions.entries()).map(([annotationId, positions]) => (
        <div 
          key={annotationId}
          className={`highlight-container-${annotationId}`}
          style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', zIndex: 1 }}
        >
          {positions.map((position, index) => (
            <Highlight
              key={`${annotationId}-${index}`}
              annotation={annotations.find(a => a.id === annotationId)!}
              position={position}
              onMouseEnter={() => onHighlightHover(annotationId, true)}
              onMouseLeave={() => onHighlightHover(annotationId, false)}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

export default HighlightedText;