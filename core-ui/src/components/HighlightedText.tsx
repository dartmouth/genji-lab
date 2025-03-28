// components/HighlightedText.tsx
import React, { useRef, useEffect, useState } from 'react';
import Highlight from './Highlight';
import { useAppDispatch, useAppSelector } from '../store/hooks/useAppDispatch';
import { RootState } from '../store';
import { updateHighlightPosition, setHoveredHighlights } from '../slice/highlightRegistrySlice';
import { debounce } from 'lodash';
import { selectAllAnnotationsForParagraph } from '../store/selector/combinedSelectors'
import { setTarget } from '../slice/annotationCreate';
import { parseURI } from '../functions/makeAnnotationBody';
import { fetchCommentingAnnotations, fetchScholarlyAnnotations, fetchReplyingAnnotations } from '../store/thunk/annotationThunks';

interface HighlightedTextProps {
  text: string;
  documentCollectionId: number,
  documentId: number,
  paragraphId: string;
}

const HighlightedText: React.FC<HighlightedTextProps> = ({
  text,
  paragraphId,
  documentCollectionId,
  documentId,
  // setSelectedText = () => {},
}) => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(fetchCommentingAnnotations(parseURI(paragraphId)));
    dispatch(fetchScholarlyAnnotations(parseURI(paragraphId)))
    dispatch(fetchReplyingAnnotations(parseURI(paragraphId)))
  }, [dispatch, paragraphId]);

  const containerRef = useRef<HTMLDivElement>(null);
  
  const [highlightPositions, setHighlightPositions] = useState<Map<string, {
    positions: Array<{ left: number; top: number; width: number; height: number }>,
    motivation: string
  }>>(new Map());
  
  const allAnnotations = useAppSelector((state: RootState) => 
    selectAllAnnotationsForParagraph(state, paragraphId)
  );
  
  const calculateHighlightPositions = () => {
    if (!containerRef.current) return;
    const textNode = containerRef.current.firstChild;
    if (!textNode || !(textNode instanceof Text)) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    
    const newPositions = new Map<string, {
      positions: Array<{ left: number; top: number; width: number; height: number }>,
      motivation: string
    }>();
    
    allAnnotations.forEach((annotation) => {
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
        
        // Store both positions and motivation
        newPositions.set(annotation.id, {
          positions: positions,
          motivation: annotation.motivation
        });
        
        dispatch(updateHighlightPosition({
          id: `highlight-${annotation.id}`,
          boundingBoxes: positions,
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
      const isHovered = positions.positions.some(box => 
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
  }, [allAnnotations, text, paragraphId]);

  // Helper functions for getting selection offsets
  const getSelectionStartOffset = (range: Range): number => {
    const preSelectionRange = range.cloneRange();
    const element = range.startContainer.parentElement || document.body;
    preSelectionRange.selectNodeContents(element);
    preSelectionRange.setEnd(range.startContainer, range.startOffset);
    return preSelectionRange.toString().length;
  };
  
  const getSelectionEndOffset = (range: Range): number => {
    const preSelectionRange = range.cloneRange();
    const element = range.endContainer.parentElement || document.body;
    preSelectionRange.selectNodeContents(element);
    preSelectionRange.setEnd(range.endContainer, range.endOffset);
    return preSelectionRange.toString().length;
  };
  
  const handleMouseUp = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      const range = selection.getRangeAt(0);
      
      dispatch(setTarget(
        {selectedText: selection.toString(),
          sourceURI: [paragraphId],
          documentCollectionId: documentCollectionId,
          documentId: documentId,
          start: getSelectionStartOffset(range),
          end: getSelectionEndOffset(range),
        }
      ))
    }
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
      {Array.from(highlightPositions.entries()).map(([annotationId, position_elems]) => (
        <div 
          key={annotationId}
          className={`highlight-container-${annotationId}`}
          style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', zIndex: 1 }}
        >
          {position_elems.positions.map((position, index) => (
            <Highlight
              key={`${annotationId}-${index}`}
              motivation={position_elems.motivation}
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