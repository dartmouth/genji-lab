// src/features/documentView/components/highlightedContent/HighlightedTextWithReferences.tsx

import React, { useState } from "react";
import { useAppSelector } from "@store/hooks";
import { RootState } from "@store";
// import { selectExternalReferencesByParagraph } from "@store/selector/combinedSelectors";
import { externalReferenceAnnotations } from "@/store/slice/annotationSlices";
import { ExternalReferenceIcon } from "../externalReferences";
import { Annotation } from "@documentView/types";
import ExternalReferencePreviewModal from "../externalReferences/ExternalReferencePreviewModal";

interface HighlightedTextWithReferencesProps {
  text: string;
  paragraphId: string;
}

interface ReferencePosition {
  index: number;
  position: number;
  annotation: Annotation;
  metadata: {
    title: string;
    description: string;
    url: string;
  };
}

const HighlightedTextWithReferences: React.FC<
  HighlightedTextWithReferencesProps
> = ({ text, paragraphId }) => {
  const [previewState, setPreviewState] = useState<{
    open: boolean;
    title: string;
    description: string;
    url: string;
  }>({
    open: false,
    title: "",
    description: "",
    url: "",
  });

  const externalReferences = useAppSelector((state: RootState) =>
    // selectExternalReferencesByParagraph(state, paragraphId)
    externalReferenceAnnotations.selectors.selectAnnotationsByParent(state, paragraphId)
  );

  if (externalReferences.length === 0) {
    return <>{text}</>;
  }

  // Calculate reference positions
  const referencePositions: ReferencePosition[] = [];

  externalReferences.forEach((annotation: Annotation, index) => {
    const target = annotation.target.find((t) => t.source === paragraphId);
    if (!target || !target.selector) return;

    const end = target.selector.refined_by.end;

    try {
      const metadata = JSON.parse(annotation.body.value);
      referencePositions.push({
        index: index + 1,
        position: end,
        annotation,
        metadata,
      });
    } catch (error) {
      console.error("Failed to parse reference metadata:", error);
    }
  });

  // Sort by position
  referencePositions.sort((a, b) => a.position - b.position);

  // Build text with superscript references
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  referencePositions.forEach((ref) => {
    // Add text before reference
    if (ref.position > lastIndex) {
      parts.push(text.substring(lastIndex, ref.position));
    }

    // Add reference icon
    parts.push(
      <ExternalReferenceIcon
        key={`ref-${ref.annotation.id}`}
        index={ref.index}
        url={ref.metadata.url}
        title={ref.metadata.title}
        onPreview={() => {
          setPreviewState({
            open: true,
            title: ref.metadata.title,
            description: ref.metadata.description,
            url: ref.metadata.url,
          });
        }}
      />
    );

    lastIndex = ref.position;
  });

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return (
    <>
      {parts}
      <ExternalReferencePreviewModal
        open={previewState.open}
        onClose={() => setPreviewState({ ...previewState, open: false })}
        title={previewState.title}
        description={previewState.description}
        url={previewState.url}
      />
    </>
  );
};

export default HighlightedTextWithReferences;
