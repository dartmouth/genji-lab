// src/features/documentView/components/highlightedContent/HighlightedText.tsx
// ENHANCED: Precise Redux-controlled navigation highlighting

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
  selectAnnotationCreate
} from '@store';
import { 
  selectIsElementHighlighted,
  selectHighlightType
} from '@store/slice/navigationHighlightSlice';
import { fetchAnnotationByMotivation } from '@store'
import {
  rangeIntersectsElement,
  calculateSegmentForParagraph,
} from '../../utils/selectionUtils';

interface HighlightedTextProps {
  text: string;
  format?: TextFormatting;
  documentCollectionId: number;
  documentId: number;
  paragraphId: string;
  isLinkingModeActive?: boolean;
  showLinkedTextHighlights?: boolean;
  viewedDocuments?: Array<{
    id: number;
    collectionId: number;
    title: string;
  }>;
}

const HighlightedText: React.FC<HighlightedTextProps> = ({
  text,
  format,
  paragraphId,
  documentCollectionId,
  documentId,
  isLinkingModeActive = false,
  showLinkedTextHighlights = false,
}) => {
  const dispatch = useAppDispatch();
  const containerRef = useRef<HTMLDivElement>(null);
  const notFetched = useRef(true);
  
  // State for dialog visibility
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Get the current annotation creation state to check if we need to show the dialog
  const annotationCreate = useAppSelector(selectAnnotationCreate);
  const { isVisible, shouldPrefetch } = useVisibilityWithPrefetch(containerRef);
  
  // 🎯 REDUX: Navigation highlighting state from Redux store
  const isNavigationHighlighted = useAppSelector(selectIsElementHighlighted(paragraphId));
  const highlightType = useAppSelector(selectHighlightType(paragraphId));
  
  // Local state for highlight positions and linked text
  const [highlightPositions, setHighlightPositions] = useState<Map<string, {
    positions: Array<{ left: number; top: number; width: number; height: number }>,
    motivation: string
  }>>(new Map());
  
  // State for linked text positions when showLinkedTextHighlights is active
  const [linkedTextPositions, setLinkedTextPositions] = useState<Array<{
    left: number; 
    top: number; 
    width: number; 
    height: number;
  }>>([]);
  
  // 🎯 NEW: State for precise Redux navigation highlights
  const [reduxNavigationPositions, setReduxNavigationPositions] = useState<Array<{
    left: number; 
    top: number; 
    width: number; 
    height: number;
  }>>([]);
  
  const [isSelectionStart, setIsSelectionStart] = useState(false);
  
  // Get regular annotations for this paragraph
  const allAnnotations = useAppSelector((state: RootState) => 
    selectAllAnnotationsForParagraph(state, paragraphId)
  );
  
  // Get linking annotations directly from the Redux state
  const allLinkingAnnotations = useAppSelector((state: RootState) => {
    try {
      const linkingState = state.annotations?.linking;
      
      if (!linkingState) {
        return [];
      }
      
      const annotations = Object.values(linkingState.byId || {}).filter(Boolean);
      return annotations;
    } catch (error) {
      console.log('Error accessing linking annotations from state:', error);
      return [];
    }
  });
  
  // Filter linking annotations for this specific paragraph
  const paragraphLinkingAnnotations = allLinkingAnnotations.filter(anno => {
    if (!anno?.target) return false;
    
    const numericId = parseURI(paragraphId);
    
    return anno.target.some(target => {
      const targetSource = target.source;
      
      const matches = [
        targetSource === paragraphId,
        targetSource === `/${paragraphId}`,
        targetSource === `/DocumentElements/${numericId}`,
        targetSource === `DocumentElements/${numericId}`,
        targetSource === String(numericId),
        targetSource === `/${numericId}`
      ];
      
      return matches.some(match => match);
    });
  });
  
  const linkingAnnotations = paragraphLinkingAnnotations;
  const hasLinkedText = linkingAnnotations.length > 0;
  
  // 🎯 REDUX: Debug logging for Redux navigation highlighting
  useEffect(() => {
    if (isNavigationHighlighted) {
      console.log(`🎯 Redux highlight ACTIVE for element: ${paragraphId} (type: ${highlightType})`);
      // Calculate precise positions when Redux highlighting activates
      calculateReduxNavigationPositions();
    } else {
      // Clear positions when highlighting deactivates
      setReduxNavigationPositions([]);
    }
  }, [isNavigationHighlighted, paragraphId, highlightType]);
  
  // Check if we need to show the dialog when annotation creation state changes
  useEffect(() => {
    if (annotationCreate && annotationCreate.motivation && 
        annotationCreate.target.segments.some(seg => seg.sourceURI === paragraphId)) {
      setIsDialogOpen(true);
    }
  }, [annotationCreate, paragraphId]);

  // Fetch annotations when component becomes visible
  useEffect(() => {
    if ((shouldPrefetch || isVisible) && notFetched.current) {
      notFetched.current = false;
      dispatch(fetchAnnotationByMotivation(parseURI(paragraphId) as unknown as number))
    }
  }, [dispatch, paragraphId, isVisible, shouldPrefetch]);
  
  // 🎯 NEW: Calculate precise Redux navigation highlight positions
  const calculateReduxNavigationPositions = () => {
    if (!containerRef.current || !isNavigationHighlighted || !hasLinkedText) {
      setReduxNavigationPositions([]);
      return;
    }
    
    const textNode = containerRef.current.firstChild;
    if (!textNode || !(textNode instanceof Text)) {
      console.log('🎯 No text node found for precise highlighting');
      return;
    }
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const navigationPositions: Array<{ left: number; top: number; width: number; height: number }> = [];
    
    // Use the same logic as linked text highlighting to get precise positions
    linkingAnnotations.forEach((annotation) => {
      let target = annotation.target?.find((t) => t.source === paragraphId);
      
      if (!target) {
        target = annotation.target?.find((t) => 
          t.source === `DocumentElements/${parseURI(paragraphId)}`
        );
      }
      
      if (!target) {
        const numericId = parseURI(paragraphId);
        target = annotation.target?.find((t) => 
          t.source === `DocumentElements/${numericId}` || 
          t.source === `/DocumentElements/${numericId}`
        );
      }
      
      if (!target || !target.selector) {
        return;
      }
      
      try {
        const { start, end } = target.selector.refined_by;
        const textLength = textNode.textContent?.length || 0;
        
        if (start < 0 || start > textLength) {
          console.warn('🎯 Invalid start position for Redux highlight:', start, 'for text length:', textLength);
          return;
        }
        
        const adjustedEnd = Math.min(end, textLength);
        const range = document.createRange();
        range.setStart(textNode, start);
        range.setEnd(textNode, adjustedEnd);
        
        const rects = Array.from(range.getClientRects());
        const positions = rects.map((rect) => ({
          left: rect.left - containerRect.left,
          top: rect.top - containerRect.top,
          width: rect.width,
          height: rect.height,
        }));
        
        navigationPositions.push(...positions);
        console.log(`🎯 Added ${positions.length} precise Redux highlight positions for range [${start}-${adjustedEnd}]`);
      } catch (error) {
        console.error('🎯 Error calculating Redux navigation positions:', error);
      }
    });
    
    setReduxNavigationPositions(navigationPositions);
    console.log(`🎯 ✅ Set ${navigationPositions.length} total Redux navigation positions`);
  };
  
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
    
    const textNode = containerRef.current.firstChild;
    if (!textNode || !(textNode instanceof Text)) {
      return;
    }
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const allLinkedPositions: Array<{ left: number; top: number; width: number; height: number }> = [];
    
    // Calculate positions for all linking annotations in this paragraph
    linkingAnnotations.forEach((annotation) => {
      let target = annotation.target?.find((t) => t.source === paragraphId);
      
      if (!target) {
        target = annotation.target?.find((t) => 
          t.source === `DocumentElements/${parseURI(paragraphId)}`
        );
      }
      
      if (!target) {
        const numericId = parseURI(paragraphId);
        target = annotation.target?.find((t) => 
          t.source === `DocumentElements/${numericId}` || 
          t.source === `/DocumentElements/${numericId}`
        );
      }
      
      if (!target || !target.selector) {
        return;
      }
      
      try {
        const { start, end } = target.selector.refined_by;
        const textLength = textNode.textContent?.length || 0;
        
        if (start < 0 || start > textLength) {
          console.warn('Invalid start position:', start, 'for text length:', textLength);
          return;
        }
        
        const adjustedEnd = Math.min(end, textLength);
        const range = document.createRange();
        range.setStart(textNode, start);
        range.setEnd(textNode, adjustedEnd);
        
        const rects = Array.from(range.getClientRects());
        const positions = rects.map((rect) => ({
          left: rect.left - containerRect.left,
          top: rect.top - containerRect.top,
          width: rect.width,
          height: rect.height,
        }));
        
        allLinkedPositions.push(...positions);
      } catch (error) {
        console.error('Error calculating linked text positions:', error);
      }
    });
    
    setLinkedTextPositions(allLinkedPositions);
  };
  
  // Handle selection start - skip during linking mode
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isLinkingModeActive) {
      return;
    }
    
    if (e.button !== 0) return;
    
    dispatch(initRedux({documentId, documentCollectionId}))
    
    const selection = window.getSelection();
    if (selection && selection.isCollapsed) {
      setIsSelectionStart(true);
    }
  };
  
  // Handle selection changes - skip during linking mode
  const handleSelectionChange = () => {
    if (isLinkingModeActive) {
      return;
    }
    
    const selection = window.getSelection();
    if (!selection) return;
    
    if (isSelectionStart) {
      dispatch(initRedux({documentId, documentCollectionId}))
      setIsSelectionStart(false);
    }
    
    updateSelectionSegment(selection);
  };
  
  // Helper to update the current paragraph's segment in a multi-paragraph selection
  const updateSelectionSegment = (selection: Selection) => {
    if (!containerRef.current) return;
    
    if (!selection || selection.rangeCount === 0) {
      return;
    }
    
    const range = selection.getRangeAt(0);
    const paragraphElement = containerRef.current;
    
    const intersects = rangeIntersectsElement(range, paragraphElement);
    
    if (intersects) {
      const { start, end, selectedText } = calculateSegmentForParagraph(
        range, paragraphElement
      );
      
      dispatch(addSelectionSegment({
        sourceURI: paragraphId,
        start,
        end,
        text: selectedText
      }))
    }
  };
  
  // Handle selection end - skip during linking mode
  const handleMouseUp = () => {
    if (isLinkingModeActive) {
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
    calculateLinkedTextPositions();
    
    // 🎯 NEW: Also calculate Redux navigation positions
    if (isNavigationHighlighted) {
      calculateReduxNavigationPositions();
    }
    
    // Set up resize observer
    const resizeObserver = new ResizeObserver(() => {
      calculateHighlightPositions();
      calculateLinkedTextPositions();
      if (isNavigationHighlighted) {
        calculateReduxNavigationPositions();
      }
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
  }, [allAnnotations, showLinkedTextHighlights, isNavigationHighlighted]);
  
  // Handler to close the dialog
  const handleCloseDialog = () => {
    setIsDialogOpen(false);
  };
  
  return (
    <>
      <div 
        id={`${paragraphId}`}
        ref={containerRef} 
        className={`annotatable-paragraph ${isLinkingModeActive ? 'linking-mode' : ''} ${isNavigationHighlighted ? 'navigation-flash-active' : ''} ${hasLinkedText ? 'has-linked-text' : ''}`}
        data-debug-linked={showLinkedTextHighlights ? `${hasLinkedText ? 'HAS-LINKS' : 'NO-LINKS'}-${linkingAnnotations.length}` : 'OFF'}
        data-navigation-highlighted={isNavigationHighlighted ? 'true' : 'false'}
        data-navigation-type={highlightType || 'none'}
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
        }}
        title={showLinkedTextHighlights && hasLinkedText ? 
          'This text has links - right-click to view linked documents' : undefined
        }
      >
        {text}
        
        {/* 🎯 ENHANCED: Precise Redux navigation highlights */}
        {isNavigationHighlighted && reduxNavigationPositions.length > 0 && (
          <div 
            className="redux-navigation-highlights-container"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              pointerEvents: 'none',
              zIndex: 15,
            }}
          >
            {reduxNavigationPositions.map((position, index) => (
              <div
                key={`redux-nav-${index}`}
                className={`redux-navigation-highlight-precise ${highlightType ? `highlight-${highlightType}` : ''}`}
                data-highlight-type="redux-navigation-precise"
                data-navigation-type={highlightType}
                style={{
                  position: 'absolute',
                  left: position.left,
                  top: position.top,
                  width: position.width,
                  height: position.height,
                  backgroundColor: 'rgba(255, 235, 59, 0.35)', // Lighter for better text readability
                  border: 'none', // Remove border that was causing outlines
                  borderRadius: '2px',
                  pointerEvents: 'none',
                  // Let CSS animation handle the flashing
                }}
              />
            ))}
          </div>
        )}
        
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
              className="linked-text-icon"
              title="This paragraph contains linked text"
              style={{
                position: 'absolute',
                top: '-2px',
                right: '-2px',
                fontSize: '12px',
                opacity: 0.7,
                pointerEvents: 'none',
                zIndex: 5,
              }}
            >
              🔗
            </div>
            
            {/* Container to prevent opacity stacking */}
            <div 
              className="linked-text-highlights-container"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                pointerEvents: 'none',
                zIndex: 2,
              }}
            >
              {linkedTextPositions.map((position, index) => (
                <div
                  key={`linked-${index}`}
                  className="linked-text-highlight"
                  style={{
                    position: 'absolute',
                    left: position.left,
                    top: position.top,
                    width: position.width,
                    height: position.height,
                    backgroundColor: 'rgba(25, 118, 210, 0.15)',
                    border: '1px solid rgba(25, 118, 210, 0.3)',
                    borderRadius: '2px',
                    pointerEvents: 'none',
                  }}
                />
              ))}
            </div>
          </>
        )}
        
        {/* 🎯 ENHANCED: Debug indicator with more detail */}
        {process.env.NODE_ENV === 'development' && isNavigationHighlighted && (
          <div 
            style={{
              position: 'absolute',
              top: '-20px',
              left: '0',
              fontSize: '10px',
              fontFamily: 'monospace',
              color: highlightType === 'source' ? '#e91e63' : '#1976d2',
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              padding: '2px 4px',
              borderRadius: '2px',
              pointerEvents: 'none',
              zIndex: 20,
              whiteSpace: 'nowrap',
            }}
          >
            🎯 Redux Nav: {highlightType || 'unknown'} ({reduxNavigationPositions.length} positions) - Doc {documentId}
          </div>
        )}
      </div>
      
      {/* Render annotation creation dialog if open - but not during linking mode */}
      {isDialogOpen && !isLinkingModeActive && <AnnotationCreationDialog onClose={handleCloseDialog} />}
    </>
  );
};

export default HighlightedText;