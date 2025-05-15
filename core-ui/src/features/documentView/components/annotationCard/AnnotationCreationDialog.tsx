// src/documentView/components/AnnotationCreationDialog.tsx
import React, { useEffect, useRef } from 'react';
import { 
  useAppDispatch, 
  useAppSelector, 
  setContent, 
  resetCreateAnnotation, 
  selectAnnotationCreate, 
  sliceMap 
} from '@store';

import { debounce } from 'lodash';
import { makeTextAnnotationBody, parseURI } from '@documentView/utils';
import { useIAM } from '@hooks/useIAM';

interface AnnotationCreationDialogProps {
  onClose: () => void;
}

const AnnotationCreationDialog: React.FC<AnnotationCreationDialogProps> = ({ onClose }) => {
  const dispatch = useAppDispatch();
  const { user } = useIAM();
  const newAnno = useAppSelector(selectAnnotationCreate);
  const dialogRef = useRef<HTMLDivElement>(null);
  
  // Close dialog when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);
  
  // Focus on textarea when opened
  useEffect(() => {
    const textArea = dialogRef.current?.querySelector('textarea');
    if (textArea) {
      textArea.focus();
    }
  }, []);

  const onTextChange = (value: string) => {
    dispatch(setContent(value));
  };

  const onSave = () => {
    if (!user) return;

    const annoType: string = newAnno.motivation;
    const slice = sliceMap[annoType] || {};

    if (!slice) {
      console.error("Bad motivation");
      return;
    }

    const annoBody = makeTextAnnotationBody(
      newAnno.target.documentCollectionId,
      newAnno.target.documentId,
      parseURI(newAnno.target.segments[0].sourceURI) as unknown as number,
      user.id,
      newAnno.motivation,
      newAnno.content,
      newAnno.target.segments
    );
    
    dispatch(slice.thunks.saveAnnotation(annoBody));
    dispatch(resetCreateAnnotation());
    onClose();
  };
  
  const onCancel = () => {
    dispatch(resetCreateAnnotation());
    onClose();
  };
  
  const onTextChangeDebounce = debounce(onTextChange, 10);

  // Don't render if there's no annotation being created
  if (!newAnno || !newAnno.motivation) {
    return null;
  }

  return (
    <div className="annotation-dialog-overlay" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000
    }}>
      <div 
        ref={dialogRef}
        className="annotation-dialog" 
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          width: '450px',
          maxWidth: '90%',
          padding: '20px',
          maxHeight: '90vh',
          overflow: 'auto'
        }}
      >
        <div className="dialog-header" style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          <h3 style={{ 
            margin: 0, 
            fontSize: '16px', 
            fontWeight: 600, 
            color: '#333'
          }}>
            {newAnno.motivation === 'commenting' ? "Add Comment" : "Add Scholarly Annotation"}
          </h3>
          <button 
            onClick={onCancel}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '18px',
              cursor: 'pointer',
              color: '#666'
            }}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        
        <div className="selected-text" style={{ 
          fontSize: '14px',
          padding: '12px',
          backgroundColor: newAnno.motivation === 'commenting' ? 'rgba(196, 221, 136, 0.2)' : 'rgba(171, 247, 255, 0.2)',
          borderRadius: '6px',
          marginBottom: '16px',
          borderLeft: `4px solid ${newAnno.motivation === 'commenting' ? '#c4dd88' : '#abf7ff'}`
        }}>
          <div style={{ fontWeight: 500, marginBottom: '4px', fontSize: '12px', color: '#666' }}>
            Selected Text:
          </div>
          "{newAnno.target.selectedText}"
        </div>
        
        <textarea
          value={newAnno.content}
          onChange={(e) => onTextChangeDebounce(e.target.value)}
          placeholder={newAnno.motivation === 'commenting' 
            ? "Enter your comment here..." 
            : "Enter your scholarly annotation here..."}
          style={{ 
            width: '100%', 
            minHeight: '120px',
            padding: '12px',
            marginBottom: '16px',
            borderRadius: '6px',
            border: '1px solid #ddd',
            fontSize: '14px',
            fontFamily: 'inherit',
            boxSizing: 'border-box',
            resize: 'vertical'
          }}
        />
        
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '8px 16px',
              backgroundColor: '#f5f5f5',
              border: '1px solid #ddd',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500
            }}
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={!newAnno.content.trim()}
            style={{
              padding: '8px 16px',
              backgroundColor: newAnno.content.trim() ? '#4285f4' : '#cccccc',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: newAnno.content.trim() ? 'pointer' : 'not-allowed',
              fontSize: '14px',
              fontWeight: 500
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default AnnotationCreationDialog;