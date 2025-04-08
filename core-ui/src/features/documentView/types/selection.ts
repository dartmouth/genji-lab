interface SelectionSegment {
  sourceURI: string;
  start: number;
  end: number;
  text: string;
  selectionIndex?: number; // Track the order of paragraphs in the selection
  isFirstParagraph?: boolean;
  isLastParagraph?: boolean;
  isFullParagraph?: boolean;
}
  
interface SelectionState {
    segments: SelectionSegment[];
    selectedText: string;
    documentCollectionId: number;
    documentId: number;
    isMultiParagraphSelection: boolean;
  }

export type { SelectionState}
export type { SelectionSegment }