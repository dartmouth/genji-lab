// src/components/SelectionReduxBridge.tsx
import React, { useEffect } from 'react';
import { useSelection } from '../hooks/useSelection';
import { useAppDispatch, setTarget } from '@store';


const SelectionReduxBridge: React.FC = () => {
  const { selectionState } = useSelection();
  const dispatch = useAppDispatch();
  
  // Sync selection state to Redux when it changes
  useEffect(() => {
    // Only sync completed selections to Redux
    if (selectionState.selectedText && !selectionState.isMultiParagraphSelection) {
      dispatch(setTarget({
        selectedText: selectionState.selectedText,
        segments: selectionState.segments,
        documentCollectionId: selectionState.documentCollectionId,
        documentId: selectionState.documentId,
        isMultiParagraphSelection: selectionState.isMultiParagraphSelection
      }));
    }
  }, [selectionState, dispatch]);
  
  return null; // This is a non-visual component
};

export default SelectionReduxBridge;