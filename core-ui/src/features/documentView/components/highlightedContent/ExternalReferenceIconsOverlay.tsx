// src/features/documentView/components/highlightedContent/ExternalReferenceIconsOverlay.tsx

import React, { useState, useEffect, useCallback, RefObject } from "react";
import { useAppSelector, useAppDispatch } from "@store/hooks";
import { externalReferenceAnnotations } from "@store/slice/annotationSlices";
import { RootState } from "@store";
import { ExternalReferenceIcon } from "../externalReferences";
import ExternalReferencePreviewModal from "../externalReferences/ExternalReferencePreviewModal";
import { getTextTargets } from "./utils";
import { Annotation } from "@documentView/types";
import useLocalStorage from "@/hooks/useLocalStorage";
import { parseURI } from "@documentView/utils";

interface ExternalReferenceIconsOverlayProps {
  text: string;
  paragraphId: string;
  containerRef: RefObject<HTMLDivElement | null>;
}

interface IconPosition {
  index: number;
  left: number;
  top: number;
  metadata: {
    title: string;
    description: string;
    url: string;
  };
  annotation: Annotation;
}

const ExternalReferenceIconsOverlay: React.FC<
  ExternalReferenceIconsOverlayProps
> = ({ text, paragraphId, containerRef }) => {
  const dispatch = useAppDispatch();

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [activeClassroomValue, _setActiveClassroomValue] =
    useLocalStorage("active_classroom");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isOptedOut, _setIsOptedOut] = useLocalStorage("classroom_opted_out");

  const [previewState, setPreviewState] = useState<{
    open: boolean;
    title: string;
    description: string;
    url: string;
    annotation: Annotation | null;
  }>({
    open: false,
    title: "",
    description: "",
    url: "",
    annotation: null,
  });

  const [iconPositions, setIconPositions] = useState<IconPosition[]>([]);

  const externalReferences = useAppSelector((state: RootState) =>
    externalReferenceAnnotations.selectors.selectAnnotationsByParent(
      state,
      paragraphId
    )
  );

  const calculatePositions = useCallback(() => {
    if (externalReferences.length === 0 || !containerRef.current || !text) {
      setIconPositions([]);
      return;
    }

    const textNode = containerRef.current.firstChild;
    if (!textNode || !(textNode instanceof Text)) {
      setIconPositions([]);
      return;
    }

    const containerRect = containerRef.current.getBoundingClientRect();
    const positions: IconPosition[] = [];

    externalReferences.forEach((annotation, index) => {
      const flatTargets = getTextTargets(annotation.target);
      const target = flatTargets.find((t) => t.source === paragraphId);
      if (!target || !target.selector) return;

      const end = target.selector.refined_by.end;
      const textLength = textNode.textContent?.length || 0;

      // Validate the end position
      if (end < 0 || end > textLength) {
        console.warn(
          `Invalid end position ${end} for text length ${textLength}`
        );
        return;
      }

      try {
        const metadata = JSON.parse(annotation.body.value);

        // Create a range to get the position at the end of the selected text
        const range = document.createRange();
        const safeEnd = Math.min(end, textLength);
        range.setStart(textNode, safeEnd);
        range.setEnd(textNode, safeEnd);

        const rects = range.getClientRects();
        if (rects.length === 0) {
          return;
        }

        const rect = rects[0];

        positions.push({
          index: index + 1,
          left: rect.left - containerRect.left,
          top: rect.top - containerRect.top,
          metadata,
          annotation,
        });
      } catch (error) {
        console.error("Failed to calculate reference icon position:", error);
      }
    });

    setIconPositions(positions);
  }, [externalReferences, text, paragraphId, containerRef]);

  useEffect(() => {
    calculatePositions();
  }, [calculatePositions]);

  // Recalculate on resize
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      calculatePositions();
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [calculatePositions, containerRef]);

  const handleDeleteSuccess = useCallback(() => {
    // Refetch external references for this paragraph after successful deletion
    const params: { documentElementId: string; classroomId?: string } = {
      documentElementId: String(parseURI(paragraphId)),
    };

    if (activeClassroomValue && isOptedOut !== "true") {
      params.classroomId = String(activeClassroomValue);
    }

    dispatch(externalReferenceAnnotations.thunks.fetchAnnotations(params));
  }, [dispatch, paragraphId, activeClassroomValue, isOptedOut]);

  if (iconPositions.length === 0) {
    return null;
  }

  return (
    <>
      {iconPositions.map((pos, idx) => (
        <div
          key={`ref-icon-${idx}`}
          style={{
            position: "absolute",
            left: `${pos.left}px`,
            top: `${pos.top}px`,
            pointerEvents: "auto",
            zIndex: 10,
          }}
        >
          <ExternalReferenceIcon
            index={pos.index}
            url={pos.metadata.url}
            title={pos.metadata.title}
            onPreview={() => {
              setPreviewState({
                open: true,
                title: pos.metadata.title,
                description: pos.metadata.description,
                url: pos.metadata.url,
                annotation: pos.annotation,
              });
            }}
          />
        </div>
      ))}
      <ExternalReferencePreviewModal
        open={previewState.open}
        onClose={() =>
          setPreviewState({
            ...previewState,
            open: false,
            annotation: null,
          })
        }
        title={previewState.title}
        description={previewState.description}
        url={previewState.url}
        annotation={previewState.annotation || undefined}
        onDeleteSuccess={handleDeleteSuccess}
      />
    </>
  );
};

export default ExternalReferenceIconsOverlay;
