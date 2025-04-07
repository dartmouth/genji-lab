// components/HighlightedText.tsx
import React, { useRef, useEffect, useState } from 'react';
import Highlight from './Highlight';
import { parseURI } from '@documentView/utils';
import rangy from 'rangy';
import 'rangy/lib/rangy-textrange';
import 'rangy/lib/rangy-serializer';

import { 
  RootState,
  useAppDispatch, 
  useAppSelector, 
  updateHighlightPosition, 
  setHoveredHighlights, 
  selectAllAnnotationsForParagraph, 
  commentingAnnotations,
  scholarlyAnnotations,
  replyingAnnotations,
  taggingAnnotations,
  initMultiParagraphSelection,
  addSelectionSegment,
  // selectIsMultiParagraphSelection,
  clearSelectionSegments,
  completeMultiParagraphSelection,
} from '@store';

import { debounce } from 'lodash';

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
}) => {
  const dispatch = useAppDispatch();
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [highlightPositions, setHighlightPositions] = useState<Map<string, {
    positions: Array<{ left: number; top: number; width: number; height: number }>,
    motivation: string
  }>>(new Map());
  
  const [isSelectionStart, setIsSelectionStart] = useState(false);
  
  const allAnnotations = useAppSelector((state: RootState) => 
    selectAllAnnotationsForParagraph(state, paragraphId)
  );
  

  // Initialize rangy
  useEffect(() => {
    rangy.init();
  }, []);

  // Fetch annotations
  useEffect(() => {
    dispatch(commentingAnnotations.thunks.fetchAnnotations(parseURI(paragraphId)));
    dispatch(scholarlyAnnotations.thunks.fetchAnnotations(parseURI(paragraphId)));
    dispatch(replyingAnnotations.thunks.fetchAnnotations(parseURI(paragraphId)));
    dispatch(taggingAnnotations.thunks.fetchAnnotations(parseURI(paragraphId)));
  }, [dispatch, paragraphId]);

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

  // Process the Rangy selection
  const processRangySelection = (selection: any) => {
    if (!selection || selection.isCollapsed) return;
    
    // Get all paragraphs
    const paragraphs = document.querySelectorAll('.annotatable-paragraph');
    
    // For each paragraph, check if it's part of the selection
    paragraphs.forEach((paragraph) => {
      const paragraphElementId = paragraph.id;
      if (!paragraphElementId) return;
      
      const currentParagraphId = paragraphElementId.replace('DocumentElements/', '');
      
      // Create a range for this paragraph
      const paragraphRange = rangy.createRange();
      paragraphRange.selectNodeContents(paragraph);
      
      // Check if selection intersects with this paragraph
      if (selection.intersectsRange(paragraphRange)) {
        // Create a range representing the intersection
        const intersectionRange = rangy.createRange();
        intersectionRange.selectNodeContents(paragraph);
        
        // Constrain to selection boundaries
        if (selection.getRangeAt(0).compareBoundaryPoints(Range.START_TO_START, paragraphRange) > 0) {
          intersectionRange.setStart(selection.getRangeAt(0).startContainer, selection.getRangeAt(0).startOffset);
        }
        
        if (selection.getRangeAt(0).compareBoundaryPoints(Range.END_TO_END, paragraphRange) < 0) {
          intersectionRange.setEnd(selection.getRangeAt(0).endContainer, selection.getRangeAt(0).endOffset);
        }
        
        // Get text content of the intersection
        const selectedText = intersectionRange.toString();
        
        // Calculate character offsets using rangy's character position methods
        const containerNode = paragraph.firstChild;
        if (!containerNode) return;
        
        const textRange = rangy.createRange();
        textRange.selectNodeContents(paragraph);
        
        let start = 0;
        let end = 0;
        
        // If the intersection starts with the paragraph, start at 0
        if (intersectionRange.startContainer === paragraphRange.startContainer && 
            intersectionRange.startOffset === paragraphRange.startOffset) {
          start = 0;
        } else {
          // Otherwise, calculate the start offset
          const startPos = getCharacterPositionFromPoint(paragraph, intersectionRange.startContainer, intersectionRange.startOffset);
          start = startPos;
        }
        
        // If the intersection ends with the paragraph, end at text length
        if (intersectionRange.endContainer === paragraphRange.endContainer && 
            intersectionRange.endOffset === paragraphRange.endOffset) {
          end = paragraph.textContent?.length || 0;
        } else {
          // Otherwise, calculate the end offset
          const endPos = getCharacterPositionFromPoint(paragraph, intersectionRange.endContainer, intersectionRange.endOffset);
          end = endPos;
        }
        
        // Add segment to the store
        dispatch(addSelectionSegment({
          sourceURI: currentParagraphId,
          start,
          end,
          text: selectedText
        }));
      }
    });
    
    // Complete the multi-paragraph selection
    dispatch(completeMultiParagraphSelection());
  };

  // Helper function to get character position
  const getCharacterPositionFromPoint = (container: Node, node: Node, offset: number): number => {
    // Create a range from the start of the container to the position
    const range = rangy.createRange();
    range.setStart(container, 0);
    range.setEnd(node, offset);
    
    // Return the length of the range's text, which is the character position
    return range.toString().length;
  };

  // Handle selection start
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only track primary mouse button
    if (e.button !== 0) return;
    
    const selection = window.getSelection();
    if (selection && selection.isCollapsed) {
      // Reset any existing multi-paragraph selection
      dispatch(clearSelectionSegments());
      dispatch(initMultiParagraphSelection({
        documentCollectionId,
        documentId
      }));
      setIsSelectionStart(true);
    }
  };

  // Handle selection end
  const handleMouseUp = () => {
    if (isSelectionStart) {
      const selection = rangy.getSelection();
      
      if (!selection.isCollapsed) {
        // Process the selection
        processRangySelection(selection);
      }
      
      setIsSelectionStart(false);
    }
  };

  // Container-level detection function for hover
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

  // Add selection change event listener
  useEffect(() => {
    const handleGlobalSelectionChange = () => {
      // We handle selection in mouseUp instead
    };
    
    document.addEventListener('selectionchange', handleGlobalSelectionChange);
    
    return () => {
      document.removeEventListener('selectionchange', handleGlobalSelectionChange);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      className="annotatable-paragraph"
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