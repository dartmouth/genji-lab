// components/HighlightedText.tsx
import React, { useRef, useEffect, useState } from 'react';
import Highlight from './Highlight';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { commentingAnnotations } from '../store/index';
import { updateHighlightPosition, setHoveredHighlights } from '../store/highlightRegistrySlice';
import { debounce } from 'lodash';
import { Annotation } from '../types/annotation';

interface SelectedTextInterface {
  content_id: number;
  start: number;
  end: number;
  text: string;
}

interface HighlightedTextProps {
  text: string;
  paragraphId: string;
  setSelectedText: (selectedText: SelectedTextInterface) => void;
  comments: Annotation[]
}

const HighlightedText: React.FC<HighlightedTextProps> = ({
  text,
  paragraphId,
  setSelectedText = () => {},
  // comments
}) => {
  const dispatch = useDispatch();
  const containerRef = useRef<HTMLDivElement>(null);
  const [highlightPositions, setHighlightPositions] = useState<Map<string, Array<{ left: number; top: number; width: number; height: number }>>>(
    new Map()
  );


  const comments = useSelector((state: RootState) => commentingAnnotations.selectors.selectAnnotationsByDocumentElement(state, paragraphId));  

  console.log(comments)

  const calculateHighlightPositions = () => {
    if (!containerRef.current) return;

    const textNode = containerRef.current.firstChild;
    if (!textNode || !(textNode instanceof Text)) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const newPositions = new Map<string, Array<{ left: number; top: number; width: number; height: number }>>();

    comments.forEach((annotation) => {
      // Find annotations that target this paragraph
      const target = annotation.target.find((t) => 
        t.source === paragraphId 
      );
      
      if (!target) return;

      try {
        const { start, end } = target.selector.refined_by;
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
        dispatch(updateHighlightPosition({
          id: `highlight-${annotation.id}`,
          boundingBoxes: positions
        }));
      } catch (error) {
        console.error('Error calculating highlight positions:', error);
      }
    });

    setHighlightPositions(newPositions);
  };

  // Container-level detection function
  const detectHighlightsAtPoint = (x: number, y: number) => {
    const highlightsAtPoint: string[] = [];
    
    highlightPositions.forEach((positions, annotationId) => {
      const isHovered = positions.some(box => 
        x >= box.left &&
        x <= box.left + box.width &&
        y >= box.top &&
        y <= box.top + box.height
      );
      
      if (isHovered) {
        highlightsAtPoint.push(annotationId);
      }
    });
    
    return highlightsAtPoint;
  };

  // Handle mouse move within this container
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const hoveredHighlights = detectHighlightsAtPoint(x, y);
    
    // Update global state with the hovered highlights from this container
    if (hoveredHighlights.length > 0) {
      dispatch(setHoveredHighlights(hoveredHighlights));
    }
  };

  // Debounce the mouse move handler for better performance
  const debouncedHandleMouseMove = debounce(handleMouseMove, 50);

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
      debouncedHandleMouseMove.cancel();
    };
   // eslint-disable-next-line
  }, [comments, text, paragraphId]);

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
      content_id: Number(startParagraph.id),
      start: range.startOffset,
      end: range.endOffset,
      text: selection.toString()
    };
    setSelectedText(newSelectionInfo);
  };

  return (
    <div 
      id={`DocumentElements/${paragraphId}`}
      ref={containerRef} 
      className="annotatable-paragraph"
      onMouseUp={handleMouseUp}
      onMouseMove={debouncedHandleMouseMove}
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
              id={`highlight-${annotationId}`}
              annotationId={`${annotationId}`}
              position={position}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

export default HighlightedText;