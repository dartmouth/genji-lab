// AnnotationCreationCard.tsx
import React from 'react';

interface AnnotationCreationCardProps {
  selectedText: string;
  annotationText: string;
  onAnnotationTextChange: (text: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

const AnnotationCreationCard: React.FC<AnnotationCreationCardProps> = ({
  selectedText,
  annotationText,
  onAnnotationTextChange,
  onSave,
  onCancel
}) => {
  return (
    <div 
      className="comment-card annotation-creation-card"
      style={{
        transition: 'background-color 0.2s ease',
        backgroundColor: '#f8f8f8',
        border: '1px solid #ddd',
        borderRadius: '4px',
        padding: '10px',
        margin: '10px 0',
      }}
    >
      <div className="comment-header" style={{ marginBottom: '8px', fontWeight: 'bold' }}>
        New Annotation
      </div>
      
      <div className="selected-text" style={{ 
        fontSize: '0.9em',
        padding: '6px',
        backgroundColor: '#ffffd0',
        borderRadius: '3px',
        marginBottom: '8px',
        borderLeft: '3px solid #ffd700'
      }}>
        "{selectedText}"
      </div>
      
      <textarea
        value={annotationText}
        onChange={(e) => onAnnotationTextChange(e.target.value)}
        placeholder="Enter your annotation here..."
        style={{ 
          width: '100%', 
          minHeight: '60px',
          padding: '8px',
          marginBottom: '10px',
          borderRadius: '4px',
          border: '1px solid #ddd',
          fontSize: '0.9em',
          fontFamily: 'inherit',
          boxSizing: 'border-box'
        }}
      />
      
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
        <button
          onClick={onCancel}
          style={{
            padding: '6px 12px',
            backgroundColor: 'white',
            border: '1px solid #ddd',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '0.9em'
          }}
        >
          Cancel
        </button>
        <button
          onClick={onSave}
          disabled={!annotationText.trim()}
          style={{
            padding: '6px 12px',
            backgroundColor: annotationText.trim() ? '#4285f4' : '#cccccc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: annotationText.trim() ? 'pointer' : 'not-allowed',
            fontSize: '0.9em'
          }}
        >
          Save
        </button>
      </div>
    </div>
  );
};

export default AnnotationCreationCard;