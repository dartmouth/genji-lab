// src/contexts/SelectionContext.tsx
import { createContext } from 'react';
import { SelectionSegment, SelectionState } from '../types/selection';


// Define the context API interface
interface SelectionContextType {
  // State
  selectionState: SelectionState;
  
  // Methods
  initSelection: (documentId: number, documentCollectionId: number) => void;
  addSegment: (segment: SelectionSegment) => void;
  completeSelection: () => void;
  resetSelection: () => void;
  isSegmentSelected: (paragraphId: string) => boolean;
  getSegmentForParagraph: (paragraphId: string) => SelectionSegment | undefined;
}

// Create the context with a default undefined value
export const SelectionContext = createContext<SelectionContextType | undefined>(undefined);

// Initial state

