// src/components/SelectionDebugger.tsx
import React from 'react';
import { useSelection } from '../hooks/useSelection';

const SelectionDebugger: React.FC = () => {
  const { selectionState } = useSelection();
//   useEffect(() => {
//     console.log(selectionState)
//   },[selectionState])
  
//   if (!selectionState.segments.length) return null;
  
  return (
    <div style={{ 
      position: 'fixed', 
      bottom: 20, 
      right: 20, 
      background: '#f0f0f0', 
      padding: 10,
      border: '1px solid #ccc',
      maxWidth: 400,
      maxHeight: 300,
      overflow: 'auto',
      zIndex: 1000
    }}>
      <h4>Selection Debug</h4>
      <div>Selected Text: {selectionState.selectedText.substring(0, 50)}...</div>
      <div>Paragraphs: {selectionState.segments.length}</div>
      <div>
        <h5>Segments:</h5>
        {selectionState.segments.map((segment, idx) => (
          <div key={idx} style={{ marginBottom: 8, padding: 5, border: '1px solid #ddd' }}>
            <div>URI: {segment.sourceURI}</div>
            <div>Index: {segment.selectionIndex}</div>
            <div>Range: {segment.start} - {segment.end}</div>
            <div>
              Position: {segment.isFirstParagraph ? 'First' : ''} 
              {segment.isLastParagraph ? 'Last' : ''} 
              {segment.isFullParagraph ? 'Full' : ''}
            </div>
            <div>Text: {segment.text.substring(0, 30)}...</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SelectionDebugger;