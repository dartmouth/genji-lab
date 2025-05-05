import React, { useRef, useEffect, useState } from 'react';
import Highlight from './Highlight';
import { parseURI } from '@documentView/utils';
import { debounce } from 'lodash';

import { useVisibilityWithPrefetch } from '@/hooks/useVisibilityWithPrefetch';

import { 
  RootState,
  useAppDispatch, 
  useAppSelector, 
  updateHighlightPosition, 
  setHoveredHighlights, 
  selectAllAnnotationsForParagraph, 
  // commentingAnnotations,
  // scholarlyAnnotations,
  // replyingAnnotations,
  // taggingAnnotations, 
  // upvoteAnnotations,
  initSelection as initRedux,
  addSelectionSegment,
  completeSelection as completeSelectionRedux
} from '@store';

import { fetchAnnotationByMotivation } from '@store'
import {
  rangeIntersectsElement,
  calculateSegmentForParagraph,
} from '../../utils/selectionUtils';

interface HighlightedTextProps {
  text: string;
  documentCollectionId: number;
  documentId: number;
  paragraphId: string;
}

const HighlightedText: React.FC<HighlightedTextProps> = ({
  text,
  paragraphId,
  documentCollectionId,
  documentId,
}) => {
  const dispatch = useAppDispatch();
  const containerRef = useRef<HTMLDivElement>(null);
  const notFetched = useRef(true)

  const { isVisible, shouldPrefetch } = useVisibilityWithPrefetch(containerRef);
  
  const [highlightPositions, setHighlightPositions] = useState<Map<string, {
    positions: Array<{ left: number; top: number; width: number; height: number }>,
    motivation: string
  }>>(new Map());
  
  const [isSelectionStart, setIsSelectionStart] = useState(false);
  
  const allAnnotations = useAppSelector((state: RootState) => 
    selectAllAnnotationsForParagraph(state, paragraphId)
  );

  useEffect(() => {
    if ((shouldPrefetch || isVisible) && notFetched.current) {
      notFetched.current = false;
      console.log(`Paragraph ${paragraphId} is visible (${isVisible}) or should prefetch (${shouldPrefetch})`)
      // dispatch(commentingAnnotations.thunks.fetchAnnotations(parseURI(paragraphId)));
      // dispatch(scholarlyAnnotations.thunks.fetchAnnotations(parseURI(paragraphId)));
      // dispatch(replyingAnnotations.thunks.fetchAnnotations(parseURI(paragraphId)));
      // dispatch(taggingAnnotations.thunks.fetchAnnotations(parseURI(paragraphId)));
      // dispatch(upvoteAnnotations.thunks.fetchAnnotations(parseURI(paragraphId)));
      dispatch(fetchAnnotationByMotivation(parseURI(paragraphId) as unknown as number))
    }
  }, [dispatch, paragraphId, isVisible, shouldPrefetch]);

  // Calculate highlight positions for existing annotations
  const calculateHighlightPositions = () => {
    if (!containerRef.current) return;
    const textNode = containerRef.current.firstChild;
    if (!textNode || !(textNode instanceof Text)) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    
    const newPositions = new Map<string, {
      positions: Array<{ left: number; top: number; width: number; height: number }>,
      motivation: string
    }>();
    
    allAnnotations.filter(anno => anno && anno.target).forEach((annotation) => {
      // Find annotations that target this paragraph
      const target = annotation.target.find((t) => 
        t.source === paragraphId 
      );
      
      if (!target) return;
      if (!target.selector) return;
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

  // Handle selection start
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only track primary mouse button
    if (e.button !== 0) return;
    // initSelection(documentId, documentCollectionId);
    dispatch(initRedux({documentId, documentCollectionId}))
    
    const selection = window.getSelection();
    if (selection && selection.isCollapsed) {
      setIsSelectionStart(true);
    }
  };
  
  // Handle selection changes
  const handleSelectionChange = () => {
    const selection = window.getSelection();
    if (!selection) return;
    
    // If this is where the selection started and it's no longer collapsed
    if (isSelectionStart) {
      // Initialize multi-paragraph selection
      dispatch(initRedux({documentId, documentCollectionId}))
      setIsSelectionStart(false);
    }
    
      updateSelectionSegment(selection);
  };
  
  // Helper to update the current paragraph's segment in a multi-paragraph selection
  const updateSelectionSegment = (selection: Selection) => {
    if (!containerRef.current) return;
    
    // Check if this paragraph is part of the selection
    const range = selection.getRangeAt(0);
    const paragraphElement = containerRef.current;
    
    // Determine if this paragraph intersects with the selection
    const intersects = rangeIntersectsElement(range, paragraphElement);
    
    if (intersects) {
      // Calculate the segment for this paragraph
      const { start, end, selectedText } = calculateSegmentForParagraph(
        range, paragraphElement
      );
      
      // Add this segment to the context
      dispatch(addSelectionSegment({
        sourceURI: paragraphId,
        start,
        end,
        text: selectedText
      }))
    }
  };
  
  // Handle selection end
  const handleMouseUp = () => {
    const selection = window.getSelection();
    if (!selection) return;
    
    if (selection.toString().trim().length > 0) {
        updateSelectionSegment(selection);
        dispatch(completeSelectionRedux())
    }
    
    setIsSelectionStart(false);
  };

  // Container-level detection function for existing highlights
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
      dispatch(setHoveredHighlights({documentId: documentId, highlightIds: hoveredHighlights}));
    }
  };

  // Debounce the mouse move handler for better performance
  const debouncedHandleMouseMove = debounce(handleMouseMove, 50);

  // Add selection change event listener
  useEffect(() => {
    const handleGlobalSelectionChange = () => {
      handleSelectionChange();
    };
    
    document.addEventListener('selectionchange', handleGlobalSelectionChange);
    
    return () => {
      document.removeEventListener('selectionchange', handleGlobalSelectionChange);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSelectionStart]);

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allAnnotations]);

  return (
    <div 
      id={`DocumentElements/${paragraphId}`}
      ref={containerRef} 
      // className={`annotatable-paragraph ${isSegmentSelected(paragraphId) ? 'has-selection' : ''}`}
      className={`annotatable-paragraph`}
      onMouseDown={handleMouseDown}
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