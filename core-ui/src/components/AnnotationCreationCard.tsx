// AnnotationCreationCard.tsx
import React from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks/useAppDispatch';
import { selectAnnotationCreate } from '../store/slice/annotationCreate';
import { setContent, resetCreateAnnotation } from '../store/slice/annotationCreate';
import { debounce } from 'lodash';
import { makeTextAnnotationBody, parseURI } from '../functions/makeAnnotationBody';
import { useIAM } from '../hooks/useIAM';
import { thunkMap } from '../store/thunk/annotationThunks';


const AnnotationCreationCard: React.FC = () => {
  const dispatch = useAppDispatch()
  const { user } =useIAM()

  const newAnno = useAppSelector(selectAnnotationCreate)

  const onTextChange = (value: string) => {
    // console.log(value)
    dispatch(setContent(value))
  };

  const onSave = () => {
    if (!user) return

    const annoType: string = newAnno.motivation

    const thunk = thunkMap[annoType] || {}

    if (!thunk) {
      console.error("Bad motivation")
      return
    }
    console.log(newAnno)

    const annoBody = makeTextAnnotationBody(
      newAnno.target.documentCollectionId,
      newAnno.target.documentId,
      parseURI(newAnno.target.sourceURI[0]) as unknown as number,
      user.id,
      newAnno.motivation,
      newAnno.target.sourceURI[0],
      newAnno.content,
      newAnno.target.start,
      newAnno.target.end
    )
    
    dispatch(thunk.create(annoBody))
    dispatch(resetCreateAnnotation())
    
  }
  const onCancel = () => {
    dispatch(resetCreateAnnotation())
  }
  const onTextChangeDebounce = debounce(onTextChange, 10)

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
        {newAnno.motivation === 'commenting' ? "New Comment" : "New Scholarly Annotation"}
      </div>
      
      <div className="selected-text" style={{ 
        fontSize: '0.9em',
        padding: '6px',
        backgroundColor: newAnno.motivation === 'commenting' ? '#c4dd88' : '#abf7ff',
        borderRadius: '3px',
        marginBottom: '8px',
        borderLeft: '3px solid #c4dd88'
      }}>
        "{newAnno.target.selectedText}"
      </div>
      
      <textarea
        value={newAnno.content}
        onChange={(e) => onTextChangeDebounce(e.target.value)}
        placeholder="Enter your comment here..."
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
          disabled={!newAnno.content.trim()}
          style={{
            padding: '6px 12px',
            backgroundColor: newAnno.content.trim() ? '#4285f4' : '#cccccc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: newAnno.content.trim() ? 'pointer' : 'not-allowed',
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