// src/features/documentView/components/highlightedContent/HighlightedText.tsx
import React, { useRef, useEffect, useState, useCallback } from "react";
import Highlight from "./Highlight";
import AnnotationCreationDialog from "../annotationCard/AnnotationCreationDialog";
import { parseURI } from "@documentView/utils";
import { debounce } from "lodash";
import { TextFormatting } from "@documentView/types";
import { useVisibilityWithPrefetch } from "@/hooks/useVisibilityWithPrefetch";
import useLocalStorage from "@/hooks/useLocalStorage";
import { commentingAnnotations } from "@store";

import { getTextTargets, findTargetForParagraph } from "./utils";

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
} from "@store";
import {
  selectIsElementHighlighted,
  selectHighlightType,
} from "@store/slice/navigationHighlightSlice";
import { fetchAnnotationByMotivation } from "@store";
import {
  rangeIntersectsElement,
  calculateSegmentForParagraph,
} from "../../utils/selectionUtils";
import "@documentView/styles/DocumentLinkingStyles.css";
import { selectLinkingAnnotationsByParagraph } from "@store/selector/combinedSelectors";

interface HighlightedTextProps {
  text: string;
  format?: TextFormatting;
  documentCollectionId: number;
  documentId: number;
  paragraphId: string;
  isLinkingModeActive?: boolean;
  viewMode?: "reading" | "annotations";
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
  viewMode = "annotations",
  documentId,
  isLinkingModeActive = false,
  showLinkedTextHighlights = false,
}) => {
  const dispatch = useAppDispatch();
  const containerRef = useRef<HTMLDivElement>(null);
  const notFetched = useRef(true);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [activeClassroomValue, _setActiveClassroomValue] =
    useLocalStorage("active_classroom");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isOptedOut, _setIsOptedOut] = useLocalStorage("classroom_opted_out");

  // State for dialog visibility
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Get the current annotation creation state to check if we need to show the dialog
  const annotationCreate = useAppSelector(selectAnnotationCreate);
  const { isVisible, shouldPrefetch } = useVisibilityWithPrefetch(containerRef);

  const isNavigationHighlighted = useAppSelector(
    selectIsElementHighlighted(paragraphId)
  );
  const highlightType = useAppSelector(selectHighlightType(paragraphId));

  // Local state for highlight positions and linked text
  const [highlightPositions, setHighlightPositions] = useState<
    Map<
      string,
      {
        positions: Array<{
          left: number;
          top: number;
          width: number;
          height: number;
        }>;
        motivation: string;
      }
    >
  >(new Map());

  interface LinkedTextPosition {
    left: number;
    top: number;
    width: number;
    height: number;
    annotationStart: number;
    annotationEnd: number;
  }

  // State for linked text positions when showLinkedTextHighlights is active
  const [linkedTextPositions, setLinkedTextPositions] = useState<
    LinkedTextPosition[]
  >([]);

  // State for precise Redux navigation highlights
  const [reduxNavigationPositions, setReduxNavigationPositions] = useState<
    Array<{
      left: number;
      top: number;
      width: number;
      height: number;
    }>
  >([]);

  const [isSelectionStart, setIsSelectionStart] = useState(false);

  // Get regular annotations for this paragraph
  const allAnnotations = useAppSelector((state: RootState) =>
    selectAllAnnotationsForParagraph(state, paragraphId)
  );

  // Use memoized selector instead of inline selector
  const linkingAnnotations = useAppSelector((state: RootState) =>
    selectLinkingAnnotationsByParagraph(state, paragraphId)
  );

  const hasLinkedText = linkingAnnotations.length > 0;

  // Calculate precise Redux navigation highlight positions with useCallback
  const calculateReduxNavigationPositions = useCallback(() => {
    if (!containerRef.current || !isNavigationHighlighted || !hasLinkedText) {
      setReduxNavigationPositions([]);
      return;
    }

    const textNode = containerRef.current.firstChild;
    if (!textNode || !(textNode instanceof Text)) {
      return;
    }

    const containerRect = containerRef.current.getBoundingClientRect();
    const navigationPositions: Array<{
      left: number;
      top: number;
      width: number;
      height: number;
    }> = [];

    // Use the same logic as linked text highlighting to get precise positions
    linkingAnnotations.forEach((annotation) => {
        const textTargets = getTextTargets(annotation.target);
        const target = findTargetForParagraph(textTargets, paragraphId);
      // let target = annotation.target?.find((t) => t.source === paragraphId);

      // if (!target) {
      //   target = annotation.target?.find(
      //     (t) => t.source === `DocumentElements/${parseURI(paragraphId)}`
      //   );
      // }

      // if (!target) {
      //   const numericId = parseURI(paragraphId);
      //   target = annotation.target?.find(
      //     (t) =>
      //       t.source === `DocumentElements/${numericId}` ||
      //       t.source === `/DocumentElements/${numericId}`
      //   );
      // }

      if (!target || !target.selector) {
        console.log("can't find link target")
        return;
      }

      try {
        const { start, end } = target.selector.refined_by;
        const textLength = textNode.textContent?.length || 0;

        if (start < 0 || start > textLength) {
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
      } catch (error) {
        console.error("Error calculating Redux navigation positions:", error);
      }
    });

    setReduxNavigationPositions(navigationPositions);
  }, [isNavigationHighlighted, hasLinkedText, linkingAnnotations, paragraphId]);

  useEffect(() => {
    if (isNavigationHighlighted) {
      // Calculate precise positions when Redux highlighting activates
      calculateReduxNavigationPositions();
    } else {
      // Clear positions when highlighting deactivates
      setReduxNavigationPositions([]);
    }
  }, [isNavigationHighlighted, calculateReduxNavigationPositions]);

  // Check if we need to show the dialog when annotation creation state changes
  useEffect(() => {
    if (
      annotationCreate &&
      annotationCreate.motivation &&
      annotationCreate.target.segments.some(
        (seg) => seg.sourceURI === paragraphId
      )
    ) {
      setIsDialogOpen(true);
    }
  }, [annotationCreate, paragraphId]);

  useEffect(() => {
    notFetched.current = true;
    dispatch(commentingAnnotations.actions.clearAnnotations());
  }, [dispatch, activeClassroomValue, isOptedOut]);

  // Fetch annotations when component becomes visible
  useEffect(() => {
    if ((shouldPrefetch || isVisible) && notFetched.current) {
      notFetched.current = false;

      const params: { documentElementId: number; classroomID?: number } = {
        documentElementId: parseURI(paragraphId) as unknown as number,
      };

      if (activeClassroomValue && isOptedOut !== "true") {
        params.classroomID = activeClassroomValue as unknown as number;
      }

      dispatch(fetchAnnotationByMotivation(params));
    }
  }, [
    dispatch,
    activeClassroomValue,
    isOptedOut,
    paragraphId,
    isVisible,
    shouldPrefetch,
  ]);

  // Calculate highlight positions for existing annotations
  const calculateHighlightPositions = () => {
    if (!containerRef.current) return;
    const textNode = containerRef.current.firstChild;
    if (!textNode || !(textNode instanceof Text)) return;
    const containerRect = containerRef.current.getBoundingClientRect();

    const newPositions = new Map<
      string,
      {
        positions: Array<{
          left: number;
          top: number;
          width: number;
          height: number;
        }>;
        motivation: string;
      }
    >();

    // Calculate positions for regular annotations (non-linking)
    const regularAnnotations = allAnnotations.filter((anno) => {
      if (!anno || !anno.target || anno.motivation === "linking") {
        return false;
      }
      // In reading mode, hide scholarly annotations and comments
      if (viewMode === "reading") {
        return false; // Hide all annotation highlights in reading mode
      }

      // In annotations mode, show all non-linking annotations
      return true;
    });

    regularAnnotations.forEach((annotation) => {
        const textTargets = getTextTargets(annotation.target);
        const target = findTargetForParagraph(textTargets, paragraphId);
      // const target = annotation.target.find((t) => t.source === paragraphId);

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
          motivation: annotation.motivation,
        });

        dispatch(
          updateHighlightPosition({
            id: `highlight-${annotation.id}`,
            boundingBoxes: positions,
          })
        );
      } catch (error) {
        console.error("Error calculating highlight positions:", error);
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

    // Store annotation range with each position
    const allLinkedPositions: Array<{
      left: number;
      top: number;
      width: number;
      height: number;
      annotationStart: number; 
      annotationEnd: number; 
    }> = [];

    linkingAnnotations.forEach((annotation) => {
      const textTargets = getTextTargets(annotation.target);
      const target = findTargetForParagraph(textTargets, paragraphId);
      // let target = annotation.target?.find((t) => t.source === paragraphId);
      // if (!target) {
      //   target = annotation.target?.find(
      //     (t) => t.source === `DocumentElements/${parseURI(paragraphId)}`
      //   );
      // }
      // if (!target) {
      //   const numericId = parseURI(paragraphId);
      //   target = annotation.target?.find(
      //     (t) =>
      //       t.source === `DocumentElements/${numericId}` ||
      //       t.source === `/DocumentElements/${numericId}`
      //   );
      // }

      if (!target || !target.selector) {
        return;
      }

      try {
        const { start, end } = target.selector.refined_by;
        const textLength = textNode.textContent?.length || 0;

        if (start < 0 || start > textLength) {
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
          annotationStart: start, 
          annotationEnd: adjustedEnd,
        }));

        allLinkedPositions.push(...positions);
      } catch (error) {
        console.error("Error calculating linked text positions:", error);
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

    dispatch(initRedux({ documentId, documentCollectionId }));

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
      dispatch(initRedux({ documentId, documentCollectionId }));
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
        range,
        paragraphElement
      );

      dispatch(
        addSelectionSegment({
          sourceURI: paragraphId,
          start,
          end,
          text: selectedText,
        })
      );
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
      dispatch(completeSelectionRedux());
    }

    setIsSelectionStart(false);
  };

  // Container-level detection function for existing highlights
  const detectHighlightsAtPoint = (x: number, y: number) => {
    const highlightsAtPoint: string[] = [];

    highlightPositions.forEach((positions, annotationId) => {
      const isHovered = positions.positions.some(
        (box) =>
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
      dispatch(
        setHoveredHighlights({
          documentId: documentId,
          highlightIds: hoveredHighlights,
        })
      );
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
      document.addEventListener("selectionchange", handleGlobalSelectionChange);
    }

    return () => {
      document.removeEventListener(
        "selectionchange",
        handleGlobalSelectionChange
      );
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSelectionStart, isLinkingModeActive]);

  // Recalculate on component mount and when annotations or text changes
  useEffect(() => {
    calculateHighlightPositions();
    calculateLinkedTextPositions();

    // Also calculate Redux navigation positions
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
  }, [
    allAnnotations,
    showLinkedTextHighlights,
    isNavigationHighlighted,
    viewMode,
  ]);

  // Handler to close the dialog
  const handleCloseDialog = () => {
    setIsDialogOpen(false);
  };

  // Calculate dynamic styles for text formatting
  const getTextFormattingStyles = (): React.CSSProperties => {
    return {
      textIndent: format?.first_line_indent
        ? `${format.first_line_indent}in`
        : "0",
      paddingLeft: format?.left_indent ? `${format.left_indent}in` : "0",
      textAlign:
        (format?.alignment as React.CSSProperties["textAlign"]) || "left",
      fontStyle: format?.text_styles?.is_italic ? "italic" : "normal",
    };
  };

  return (
    <>
      <div
        id={`${paragraphId}`}
        ref={containerRef}
        className={`annotatable-paragraph ${
          isLinkingModeActive ? "linking-mode" : ""
        } ${isNavigationHighlighted ? "navigation-flash-active" : ""} ${
          hasLinkedText ? "has-linked-text" : ""
        }`}
        data-debug-linked={
          showLinkedTextHighlights
            ? `${hasLinkedText ? "HAS-LINKS" : "NO-LINKS"}-${
                linkingAnnotations.length
              }`
            : "OFF"
        }
        data-navigation-highlighted={isNavigationHighlighted ? "true" : "false"}
        data-navigation-type={highlightType || "none"}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseMove={debouncedHandleMouseMove}
        style={getTextFormattingStyles()}
      >
        {text}

        {/* Precise Redux navigation highlights */}
        {isNavigationHighlighted && reduxNavigationPositions.length > 0 && (
          <div className="redux-navigation-highlights-container">
            {reduxNavigationPositions.map((position, index) => (
              <div
                key={`redux-nav-${index}`}
                className={`redux-navigation-highlight-precise ${
                  highlightType ? `highlight-${highlightType}` : ""
                }`}
                data-highlight-type="redux-navigation-precise"
                data-navigation-type={highlightType}
                style={{
                  left: position.left,
                  top: position.top,
                  width: position.width,
                  height: position.height,
                }}
              />
            ))}
          </div>
        )}

        {/* Render highlight containers for regular annotations */}
        {Array.from(highlightPositions.entries()).map(
          ([annotationId, position_elems]) => (
            <div
              key={annotationId}
              className={`highlight-container highlight-container-${annotationId}`}
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
          )
        )}

        {/* Render linked text highlights when showLinkedTextHighlights is active */}
        {showLinkedTextHighlights && hasLinkedText && (
          <>
            {/* Link icon indicator - positioned to not interfere with text */}
            <div
              className="linked-text-icon"
              title="This paragraph contains linked text"
            >
              🔗
            </div>

            {/* Container to prevent opacity stacking */}
            <div className="linked-text-highlights-container">
              {linkedTextPositions.map((position, index) => {
                const annotationData = linkingAnnotations.find((annotation) => {
                  // First, flatten and filter to get only TextTargets
                  const textTargets = getTextTargets(annotation.target);
                  
                  // Find the matching target for this paragraph
                  const target = findTargetForParagraph(textTargets, paragraphId);
                  
                  if (!target?.selector) return false;
                  
                  // Check if this position matches the annotation's range
                  const { start, end } = target.selector.refined_by;
                  return (
                    position.annotationStart === start &&
                    position.annotationEnd === end
                  );
                });
                
                return (
                  <div
                    key={`linked-${index}`}
                    className="linked-text-highlight"
                    data-start={position.annotationStart}
                    data-end={position.annotationEnd}
                    data-annotation-id={annotationData?.id}
                    style={{
                      left: position.left,
                      top: position.top,
                      width: position.width,
                      height: position.height,
                    }}
                  />
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Render annotation creation dialog if open - but not during linking mode */}
      {isDialogOpen && !isLinkingModeActive && (
        <AnnotationCreationDialog onClose={handleCloseDialog} />
      )}
    </>
  );
};

export default HighlightedText;
