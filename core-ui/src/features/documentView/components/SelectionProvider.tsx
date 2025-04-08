import React, {useState, useMemo, useCallback } from 'react';
import { SelectionSegment, SelectionState } from '../types/selection';
import { SelectionContext } from '../contexts/SelectionContext';

  const initialState: SelectionState = {
    segments: [],
    selectedText: "",
    documentCollectionId: 0,
    documentId: 0,
    isMultiParagraphSelection: true
  };
  
  // Create the provider component
  export const SelectionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [selectionState, setSelectionState] = useState<SelectionState>(initialState);
  
    // Initialize a new selection
    const initSelection = useCallback((documentId: number, documentCollectionId: number) => {
      setSelectionState({
        segments: [],
        selectedText: "",
        documentCollectionId,
        documentId,
        isMultiParagraphSelection: true
      });
    }, []);
  
    // Add or update a segment
    const addSegment = useCallback((segment: SelectionSegment) => {
        setSelectionState(prevState => {
          const existingIndex = prevState.segments.findIndex(
            s => s.sourceURI === segment.sourceURI
          );
          
          let updatedSegments;
          if (existingIndex >= 0) {
            // Update existing segment
            updatedSegments = [...prevState.segments];
            updatedSegments[existingIndex] = {
              ...segment,
              // Preserve the selection index if it exists
              selectionIndex: updatedSegments[existingIndex].selectionIndex
            };
          } else {
            // Add new segment with a selection index
            updatedSegments = [...prevState.segments, {
              ...segment,
              // Assign a new index based on the current number of segments
              selectionIndex: prevState.segments.length
            }];
          }
          
          return {
            ...prevState,
            segments: updatedSegments
          };
        });
      }, []);
  
    // Update the completeSelection function to sort by selectionIndex
    const completeSelection = useCallback(() => {
        setSelectionState(prevState => {
        // Sort segments by their selection index to maintain proper order
        const sortedSegments = [...prevState.segments].sort((a, b) => 
            a.sourceURI.localeCompare(b.sourceURI)
        );
        
        // Combine all text from segments
        const combinedText = sortedSegments.reduce((text, segment, index) => {
            const prefix = index === 0 ? '' : ' ';
            return text + prefix + segment.text;
        }, '');
        
        // Mark first and last paragraphs explicitly
        if (sortedSegments.length > 0) {
            sortedSegments[0].isFirstParagraph = true;
            sortedSegments[sortedSegments.length - 1].isLastParagraph = true;
        }
        
        return {
            ...prevState,
            segments: sortedSegments,
            selectedText: combinedText,
            isMultiParagraphSelection: false
        };
        });
    }, []);

    // In the Selection Context, add a function to normalize selection direction
    const normalizeSelectionDirection = useCallback((segments: SelectionSegment[]) => {
        // If user selected bottom-to-top, the segments might be in reverse order
        // Check the DOM positions of the first and last segments to determine direction
        if (segments.length < 2) return segments;
        
        // Get the first and last paragraphs by selection index
        const orderedSegments = [...segments].sort((a, b) => 
            a.sourceURI.localeCompare(b.sourceURI)
        );
        
        const firstParagraph = document.getElementById(`DocumentElements/${orderedSegments[0].sourceURI}`);
        const lastParagraph = document.getElementById(`DocumentElements/${orderedSegments[orderedSegments.length-1].sourceURI}`);
        
        if (firstParagraph && lastParagraph) {
        // Compare their DOM positions
        const comparison = firstParagraph.compareDocumentPosition(lastParagraph);
        
        // If first paragraph comes after last paragraph, reverse the order
        if (comparison & Node.DOCUMENT_POSITION_PRECEDING) {
            return orderedSegments.reverse().map((segment, idx) => ({
            ...segment,
            selectionIndex: idx
            }));
        }
        }
        
        return orderedSegments;
    }, []);
    // Reset selection state
    const resetSelection = useCallback(() => {
      setSelectionState(initialState);
    }, []);
  
    // Check if a paragraph has a selected segment
    const isSegmentSelected = useCallback((paragraphId: string) => {
      return selectionState.segments.some(segment => segment.sourceURI === paragraphId);
    }, [selectionState.segments]);
  
    // Get the segment for a specific paragraph
    const getSegmentForParagraph = useCallback((paragraphId: string) => {
      return selectionState.segments.find(segment => segment.sourceURI === paragraphId);
    }, [selectionState.segments]);
  
    // Memoize the context value to prevent unnecessary re-renders
    const contextValue = useMemo(() => ({
      selectionState,
      initSelection,
      addSegment,
      completeSelection,
      resetSelection,
      isSegmentSelected,
      getSegmentForParagraph,
      normalizeSelectionDirection
    }), [
      selectionState, 
      initSelection, 
      addSegment, 
      completeSelection, 
      resetSelection,
      isSegmentSelected,
      getSegmentForParagraph,
      normalizeSelectionDirection
    ]);
  
    return (
      <SelectionContext.Provider value={contextValue}>
        {children}
      </SelectionContext.Provider>
    );
  };
  