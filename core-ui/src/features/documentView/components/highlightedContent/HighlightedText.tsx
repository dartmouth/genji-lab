// src/documentView/components/HighlightedText.tsx
import React, { useRef, useEffect, useState } from 'react';
import Highlight from './Highlight';
import AnnotationCreationDialog from '../annotationCard/AnnotationCreationDialog';
import { parseURI } from '@documentView/utils';
import { debounce } from 'lodash';
import { TextFormatting } from '@documentView/types'

import { useVisibilityWithPrefetch } from '@/hooks/useVisibilityWithPrefetch';

import { 
  RootState,
  useAppDispatch, 
  useAppSelector, 
  updateHighlightPosition, 
  setHoveredHighlights, 
  selectAllAnnotationsForParagraph, 
  initSelection as initRedux,
  addSelectionSegment,
  completeSelection as completeSelectionRedux,
  selectAnnotationCreate,
  // Remove the problematic import
} from '@store';

import { fetchAnnotationByMotivation } from '@store'
import {
  rangeIntersectsElement,
  calculateSegmentForParagraph,
} from '../../utils/selectionUtils';

interface HighlightedTextProps {
  text: string;
  format?: TextFormatting; // Make format optional since it can be undefined
  documentCollectionId: number;
  documentId: number;
  paragraphId: string;
  isLinkingModeActive?: boolean;
  showLinkedTextHighlights?: boolean; // Add the new prop
  viewedDocuments?: Array<{
    id: number;
    collectionId: number;
    title: string;
  }>; // Add viewed documents prop for context
}

const HighlightedText: React.FC<HighlightedTextProps> = ({
  text,
  format,
  paragraphId,
  documentCollectionId,
  documentId,
  isLinkingModeActive = false,
  showLinkedTextHighlights = false, // Default to false
}) => {
  const dispatch = useAppDispatch();
  const containerRef = useRef<HTMLDivElement>(null);
  const notFetched = useRef(true);

  // Add state for dialog visibility
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Get the current annotation creation state to check if we need to show the dialog
  const annotationCreate = useAppSelector(selectAnnotationCreate);

  const { isVisible, shouldPrefetch } = useVisibilityWithPrefetch(containerRef);
  
  const [highlightPositions, setHighlightPositions] = useState<Map<string, {
    positions: Array<{ left: number; top: number; width: number; height: number }>,
    motivation: string
  }>>(new Map());
  
  // Add state for linked text positions when showLinkedTextHighlights is active
  const [linkedTextPositions, setLinkedTextPositions] = useState<Array<{
    left: number; 
    top: number; 
    width: number; 
    height: number;
  }>>([]);
  
  const [isSelectionStart, setIsSelectionStart] = useState(false);
  
  const allAnnotations = useAppSelector((state: RootState) => 
    selectAllAnnotationsForParagraph(state, paragraphId)
  );

  // Get linking annotations directly from the Redux state
  const allLinkingAnnotations = useAppSelector((state: RootState) => {
    try {
      // Access linking annotations from the annotations slice
      const linkingState = state.annotations?.linking;
      
      if (!linkingState) {
        console.log('No linking annotations state found');
        return [];
      }
      
      // Get all linking annotations from the byId index
      const annotations = Object.values(linkingState.byId || {}).filter(Boolean);
      
      console.log('Found linking annotations in state:', {
        count: annotations.length,
        stateStructure: {
          hasLinkingState: !!linkingState,
          byIdKeys: Object.keys(linkingState.byId || {}),
          byParentKeys: Object.keys(linkingState.byParent || {})
        }
      });
      
      return annotations;
    } catch (error) {
      console.log('Error accessing linking annotations from state:', error);
      return [];
    }
  });

  // Filter linking annotations for this specific paragraph
  const paragraphLinkingAnnotations = allLinkingAnnotations.filter(anno => {
    if (!anno?.target) return false;
    
    // Extract the numeric ID from the paragraphId for comparison
    const numericId = parseURI(paragraphId); // This should extract "12" from "DocumentElements/12"
    
    // Check if any target matches this paragraph
    return anno.target.some(target => {
      const targetSource = target.source;
      
      // Try multiple format matches
      const matches = [
        targetSource === paragraphId,                           // "DocumentElements/12"
        targetSource === `/${paragraphId}`,                     // "/DocumentElements/12"
        targetSource === `/DocumentElements/${numericId}`,      // "/DocumentElements/12"
        targetSource === `DocumentElements/${numericId}`,       // "DocumentElements/12"
        targetSource === String(numericId),                     // "12"
        targetSource === `/${numericId}`                        // "/12"
      ];
      
      return matches.some(match => match);
    });
  });

  // Filter linking annotations for this paragraph - USE THE NEW SOURCE
  const linkingAnnotations = paragraphLinkingAnnotations;

  // Check if this paragraph has any linking annotations
  const hasLinkedText = linkingAnnotations.length > 0;

  // DEBUG: Log annotation information when showLinkedTextHighlights is true
  useEffect(() => {
    if (showLinkedTextHighlights) {
      console.log('HighlightedText DEBUG:', {
        paragraphId,
        showLinkedTextHighlights,
        allAnnotationsCount: allAnnotations.length,
        allLinkingAnnotationsCount: allLinkingAnnotations.length,
        paragraphLinkingAnnotationsCount: paragraphLinkingAnnotations.length,
        linkingAnnotationsCount: linkingAnnotations.length,
        hasLinkedText,
        allAnnotations: allAnnotations.map(a => ({
          id: a.id,
          motivation: a.motivation,
          targets: a.target?.map(t => t.source) || []
        })),
        allLinkingAnnotations: allLinkingAnnotations.map(a => ({
          id: a.id,
          motivation: a.motivation,
          targets: a.target?.map(t => t.source) || []
        })),
        paragraphLinkingAnnotations: paragraphLinkingAnnotations.map(a => ({
          id: a.id,
          motivation: a.motivation,
          targets: a.target?.map(t => t.source) || []
        }))
      });
    }
  }, [showLinkedTextHighlights, allAnnotations, allLinkingAnnotations, paragraphLinkingAnnotations, linkingAnnotations, hasLinkedText, paragraphId]);

  // Check if we need to show the dialog when annotation creation state changes
  useEffect(() => {
    if (annotationCreate && annotationCreate.motivation && 
        annotationCreate.target.segments.some(seg => seg.sourceURI === paragraphId)) {
      setIsDialogOpen(true);
    }
  }, [annotationCreate, paragraphId]);

  useEffect(() => {
    if ((shouldPrefetch || isVisible) && notFetched.current) {
      notFetched.current = false;

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
    
    // Calculate positions for regular annotations (non-linking)
    const regularAnnotations = allAnnotations.filter(anno => 
      anno && anno.target && anno.motivation !== 'linking'
    );
    
    regularAnnotations.forEach((annotation) => {
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

  // Calculate linked text positions when showLinkedTextHighlights is true
  const calculateLinkedTextPositions = () => {
    if (!containerRef.current || !showLinkedTextHighlights || !hasLinkedText) {
      setLinkedTextPositions([]);
      return;
    }
    
    console.log('calculateLinkedTextPositions called:', {
      paragraphId,
      linkingAnnotationsCount: linkingAnnotations.length,
      showLinkedTextHighlights
    });
    
    const textNode = containerRef.current.firstChild;
    if (!textNode || !(textNode instanceof Text)) {
      console.log('No text node found');
      return;
    }
    const containerRect = containerRef.current.getBoundingClientRect();
    
    const allLinkedPositions: Array<{ left: number; top: number; width: number; height: number }> = [];
    
    // Calculate positions for all linking annotations in this paragraph
    linkingAnnotations.forEach((annotation) => {
      console.log('Processing linking annotation:', {
        id: annotation.id,
        targets: annotation.target?.map(t => ({ source: t.source, selector: t.selector })) || []
      });
      
      // Try multiple target matching strategies
      let target = annotation.target?.find((t) => t.source === paragraphId);
      
      // If not found, try alternative formats
      if (!target) {
        target = annotation.target?.find((t) => 
          t.source === `DocumentElements/${parseURI(paragraphId)}`
        );
      }
      
      // If still not found, try without leading slash
      if (!target) {
        const numericId = parseURI(paragraphId);
        target = annotation.target?.find((t) => 
          t.source === `DocumentElements/${numericId}` || 
          t.source === `/DocumentElements/${numericId}`
        );
      }
      
      if (!target) {
        console.log('No matching target found for annotation:', annotation.id, 'paragraphId:', paragraphId);
        return;
      }
      
      if (!target.selector) {
        console.log('No selector found for target:', target);
        return;
      }
      
      try {
        const { start, end } = target.selector.refined_by;
        console.log('Creating range:', { start, end, textLength: textNode.textContent?.length });
        
        const range = document.createRange();
        range.setStart(textNode, start);
        range.setEnd(textNode, end);
        
        const rects = Array.from(range.getClientRects());
        console.log('Range rects:', rects.length);
        
        const positions = rects.map((rect) => ({
          left: rect.left - containerRect.left,
          top: rect.top - containerRect.top,
          width: rect.width,
          height: rect.height,
        }));
        
        console.log('Calculated positions for annotation:', annotation.id, positions);
        allLinkedPositions.push(...positions);
      } catch (error) {
        console.error('Error calculating linked text positions:', error);
      }
    });
    
    console.log('Final linked text positions:', allLinkedPositions);
    setLinkedTextPositions(allLinkedPositions);
  };

  // Handle selection start - skip during linking mode
  const handleMouseDown = (e: React.MouseEvent) => {
    // Skip selection handling during linking mode
    if (isLinkingModeActive) {
      console.log('HighlightedText: Skipping mouseDown due to linking mode'); // DEBUG
      return;
    }
    
    // Only track primary mouse button
    if (e.button !== 0) return;
    // initSelection(documentId, documentCollectionId);
    dispatch(initRedux({documentId, documentCollectionId}))
    
    const selection = window.getSelection();
    if (selection && selection.isCollapsed) {
      setIsSelectionStart(true);
    }
  };
  
  // Handle selection changes - skip during linking mode
  const handleSelectionChange = () => {
    // Skip selection handling during linking mode
    if (isLinkingModeActive) {
      return;
    }
    
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
    
    // Safety check: ensure there are ranges available
    if (!selection || selection.rangeCount === 0) {
      return;
    }
    
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

  // console.log('HighlightedText paragraphId:', paragraphId);
  
  // Handle selection end - skip during linking mode
  const handleMouseUp = () => {
    // Skip selection handling during linking mode
    if (isLinkingModeActive) {
      console.log('HighlightedText: Skipping mouseUp due to linking mode'); // DEBUG
      return;
    }
    
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

  // Add selection change event listener - skip during linking mode
  useEffect(() => {
    const handleGlobalSelectionChange = () => {
      handleSelectionChange();
    };
    
    // Only add listener if not in linking mode
    if (!isLinkingModeActive) {
      document.addEventListener('selectionchange', handleGlobalSelectionChange);
    }
    
    return () => {
      document.removeEventListener('selectionchange', handleGlobalSelectionChange);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSelectionStart, isLinkingModeActive]);

  // Recalculate on component mount and when annotations or text changes
  useEffect(() => {
    calculateHighlightPositions();
    calculateLinkedTextPositions(); // Calculate linked text positions
    
    // Set up resize observer
    const resizeObserver = new ResizeObserver(() => {
      calculateHighlightPositions();
      calculateLinkedTextPositions(); // Recalculate linked text positions on resize
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
  }, [allAnnotations, showLinkedTextHighlights]);

  // Handler to close the dialog
  const handleCloseDialog = () => {
    setIsDialogOpen(false);
  };

  return (
    <>
      <div 
        id={`${paragraphId}`}
        ref={containerRef} 
        className={`annotatable-paragraph ${isLinkingModeActive ? 'linking-mode' : ''}`}
        data-debug-linked={showLinkedTextHighlights ? `${hasLinkedText ? 'HAS-LINKS' : 'NO-LINKS'}-${linkingAnnotations.length}` : 'OFF'}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseMove={debouncedHandleMouseMove}
        style={{ 
          position: 'relative',
          textIndent: format?.first_line_indent ? `${format.first_line_indent}in` : '0',
          paddingLeft: format?.left_indent ? `${format.left_indent}in` : '0',
          textAlign: format?.alignment || 'left',
          writingMode: 'horizontal-tb',
          fontStyle: format?.text_styles?.is_italic ? 'italic' : 'normal',
          whiteSpace: 'pre-wrap',
          // Add visual indication for linking mode
          ...(isLinkingModeActive ? {
            cursor: 'crosshair',
            userSelect: 'text'
          } : {})
          // REMOVED: Paragraph-level background styling that was causing the issue
        }}
        title={showLinkedTextHighlights && hasLinkedText ? 
          'This text has links - right-click to view linked documents' : undefined
        }
      >
        {text}
        
        {/* Render highlight containers for regular annotations */}
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

        {/* Render linked text highlights when showLinkedTextHighlights is active */}
        {showLinkedTextHighlights && hasLinkedText && (
          <>
            {/* Link icon indicator - positioned to not interfere with text */}
            <div 
              style={{
                position: 'absolute',
                top: '-2px',
                right: '2px',
                fontSize: '10px',
                color: '#dc3545',
                pointerEvents: 'none',
                zIndex: 3,
                textShadow: '0 0 2px rgba(255,255,255,0.9)',
                opacity: 0.8
              }}
              title="This paragraph contains linked text"
            >
              🔗
            </div>
            
            {/* Precise linked text range highlighting */}
            {linkedTextPositions.map((position, index) => (
              <div
                key={`linked-${index}`}
                style={{
                  position: 'absolute',
                  left: position.left,
                  top: position.top,
                  width: position.width,
                  height: position.height,
                  backgroundColor: 'rgba(220, 53, 69, 0.25)', // Red highlighting for linked text
                  borderRadius: '1px',
                  pointerEvents: 'none',
                  zIndex: 2,
                  transition: 'background-color 0.2s ease'
                }}
              />
            ))}
          </>
        )}
      </div>

      {/* Render annotation creation dialog if open - but not during linking mode */}
      {isDialogOpen && !isLinkingModeActive && <AnnotationCreationDialog onClose={handleCloseDialog} />}
    </>
  );
};

export default HighlightedText;