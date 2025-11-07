// src/features/documentView/components/highlightedContent/HighlightedText.tsx

import React, { useRef, useEffect, useState, useCallback } from "react";
import Highlight from "./Highlight";
import AnnotationCreationDialog from "../annotationCard/AnnotationCreationDialog";
import { parseURI } from "@documentView/utils";
import { debounce } from "lodash";
import { TextFormatting } from "@documentView/types";
import { useVisibilityWithPrefetch } from "@/hooks/useVisibilityWithPrefetch";
import useLocalStorage from "@/hooks/useLocalStorage";
import { linkingAnnotations as linkAnnotations } from "@store";

import { getTextTargets, findTargetForParagraph } from "./utils";

import ExternalReferenceIconsOverlay from "./ExternalReferenceIconsOverlay";
import {
  RootState,
  useAppDispatch,
  useAppSelector,
  updateHighlightPosition,
  setHoveredHighlights,
  registerHighlight,
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

  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const annotationCreate = useAppSelector(selectAnnotationCreate);
  const { isVisible, shouldPrefetch } = useVisibilityWithPrefetch(containerRef);

  const isNavigationHighlighted = useAppSelector(
    selectIsElementHighlighted(paragraphId)
  );
  const highlightType = useAppSelector(selectHighlightType(paragraphId));

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
    annotationId: string;
  }

  const [linkedTextPositions, setLinkedTextPositions] = useState<
    LinkedTextPosition[]
  >([]);

  const [reduxNavigationPositions, setReduxNavigationPositions] = useState<
    Array<{
      left: number;
      top: number;
      width: number;
      height: number;
    }>
  >([]);

  const [isSelectionStart, setIsSelectionStart] = useState(false);

  const allAnnotations = useAppSelector((state: RootState) =>
    selectAllAnnotationsForParagraph(state, paragraphId)
  );

  const linkingAnnotations = useAppSelector((state: RootState) =>
    linkAnnotations.selectors.selectAnnotationsByParent(state, paragraphId)
  );

  const hasLinkedText = linkingAnnotations.length > 0;

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

    linkingAnnotations.forEach((annotation) => {
      const textTargets = getTextTargets(annotation.target);
      const target = findTargetForParagraph(textTargets, paragraphId);

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
      calculateReduxNavigationPositions();
    } else {
      setReduxNavigationPositions([]);
    }
  }, [isNavigationHighlighted, calculateReduxNavigationPositions]);

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
  }, [dispatch, activeClassroomValue, isOptedOut]);

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

    const regularAnnotations = allAnnotations.filter((anno) => {
      if (!anno || !anno.target || anno.motivation === "linking") {
        return false;
      }
      if (viewMode === "reading") {
        return false;
      }
      return true;
    });

    regularAnnotations.forEach((annotation) => {
      const textTargets = getTextTargets(annotation.target);
      const target = findTargetForParagraph(textTargets, paragraphId);

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
            documentId: documentId,
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

  // Now registers linking highlights in Redux
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

    const allLinkedPositions: Array<{
      left: number;
      top: number;
      width: number;
      height: number;
      annotationStart: number;
      annotationEnd: number;
      annotationId: string;
    }> = [];

    linkingAnnotations.forEach((annotation) => {
      const textTargets = getTextTargets(annotation.target);
      const target = findTargetForParagraph(textTargets, paragraphId);

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
          annotationId: annotation.id.toString(),
        }));

        allLinkedPositions.push(...positions);

        // Register this linking highlight in Redux
        const highlightId = `linking-${annotation.id}-${paragraphId}`;

        dispatch(
          registerHighlight({
            documentId: documentId,
            id: highlightId,
            motivation: "linking",
            paragraphId: paragraphId,
            boundingBoxes: positions.map((p) => ({
              left: p.left,
              top: p.top,
              width: p.width,
              height: p.height,
            })),
            annotationId: annotation.id.toString(),
          })
        );
      } catch (error) {
        console.error("Error calculating linked text positions:", error);
      }
    });

    setLinkedTextPositions(allLinkedPositions);
  };

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

  // Detects linking highlights
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Detect regular annotation highlights
    const hoveredHighlights = detectHighlightsAtPoint(x, y);

    // Also detect linking highlights
    const hoveredLinkingHighlights: string[] = [];

    if (showLinkedTextHighlights && hasLinkedText) {
      linkedTextPositions.forEach((position) => {
        const isHovered =
          x >= position.left &&
          x <= position.left + position.width &&
          y >= position.top &&
          y <= position.top + position.height;

        if (isHovered) {
          // Create the same highlight ID format we used when registering
          const highlightId = `linking-${position.annotationId}-${paragraphId}`;
          hoveredLinkingHighlights.push(highlightId);
        }
      });
    }

    // Combine all hovered highlights
    const allHoveredHighlights = [
      ...hoveredHighlights,
      ...hoveredLinkingHighlights,
    ];

    if (allHoveredHighlights.length > 0) {
      dispatch(
        setHoveredHighlights({
          documentId: documentId,
          highlightIds: allHoveredHighlights,
        })
      );
    }
  };

  const debouncedHandleMouseMove = debounce(handleMouseMove, 50);

  useEffect(() => {
    const handleGlobalSelectionChange = () => {
      handleSelectionChange();
    };

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

  useEffect(() => {
    calculateHighlightPositions();
    calculateLinkedTextPositions();

    if (isNavigationHighlighted) {
      calculateReduxNavigationPositions();
    }

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
    documentId,
  ]);

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
  };

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

        {showLinkedTextHighlights && hasLinkedText && (
          <>
            <div
              className="linked-text-icon"
              title="This paragraph contains linked text"
            >
              🔗
            </div>

            <div className="linked-text-highlights-container">
              {linkedTextPositions.map((position, index) => {
                return (
                  <div
                    key={`linked-${index}`}
                    className="linked-text-highlight"
                    data-start={position.annotationStart}
                    data-end={position.annotationEnd}
                    data-annotation-id={position.annotationId}
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

        <ExternalReferenceIconsOverlay
          text={text}
          paragraphId={paragraphId}
          containerRef={containerRef}
        />
      </div>

      {isDialogOpen && !isLinkingModeActive && (
        <AnnotationCreationDialog onClose={handleCloseDialog} />
      )}
    </>
  );
};

export default HighlightedText;
