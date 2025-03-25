import React, { useEffect, useState, useCallback, useMemo } from 'react';
import HighlightedText from './HighlightedText';
import AnnotationCard from './AnnotationCard';
import AnnotationCreationCard from './AnnotationCreationCard';
import { DocumentElement } from '../types/documentElement';
import { FaChevronRight, FaChevronLeft } from 'react-icons/fa';
import { useApiClient } from '../hooks/useApi';
import { RootState } from '../store/index';
import { useDispatch, useSelector } from 'react-redux';
import { commentingAnnotations } from '../store';
import { useAnnotationCreation } from '../hooks/useAnnotationCreation';
import { scholarlyAnnotations } from '../store/annotations';

interface DocumentContentPanelProps {
    documentID: number;
}

const DocumentContentPanel: React.FC<DocumentContentPanelProps> = ({ 
    documentID,
}) => {
    // STATE
    const [collapsedComments, setCollapsedComments] = useState<boolean>(false);
    const [hasAutoOpened, setHasAutoOpened] = useState<boolean>(false);
    
    // Use the extracted annotation creation hook
    const {
        selectionInfo,
        setSelectionInfo,
        newAnnotationText,
        setNewAnnotationText,
        handleCreateAnnotation,
        handleCancelAnnotation,
        annotations
    } = useAnnotationCreation(documentID, "commenting");
    
    const scholarlyAnnotationCreate = useAnnotationCreation(documentID, "scholarly")
    // HOOKS
    const elements = useApiClient<DocumentElement[]>(`/documents/${documentID}/elements/`);
    
    // REDUX
    const dispatch = useDispatch();
    
    // Update to use the commentingAnnotations slice actions
    const dispatchAnnotationsMemo = useCallback(() => {
        if (annotations.data && annotations.data.length > 0) {
            dispatch(commentingAnnotations.actions.addAnnotations(annotations.data));
        }
    }, [dispatch, annotations.data]);

    const dispatchScholarlyAnnotationsMemo = useCallback(() => {
        if (scholarlyAnnotationCreate.annotations.data && scholarlyAnnotationCreate.annotations.data.length > 0) {
            dispatch(scholarlyAnnotations.actions.addAnnotations(scholarlyAnnotationCreate.annotations.data));
        }
    }, [dispatch, scholarlyAnnotationCreate.annotations.data]);

    
    useEffect(() => {
        dispatchAnnotationsMemo();
    }, [dispatchAnnotationsMemo]);

    useEffect(() => {
        dispatchScholarlyAnnotationsMemo();
    }, [dispatchScholarlyAnnotationsMemo]);
    
    const hoveredHighlightIds = useSelector(
        (state: RootState) => state.highlightRegistry.hoveredHighlightIds
    );
    
    // Update to use the commentingAnnotations slice selectors
    const makeSelectAnnotationsById = useMemo(
        () => commentingAnnotations.selectors.makeSelectAnnotationsById(),
        []
    );
    
    const hoveredAnnotations = useSelector(
        (state: RootState) => makeSelectAnnotationsById(state, hoveredHighlightIds)
    );

    useEffect(() => {
        if (hoveredAnnotations.length > 0 && !hasAutoOpened && !collapsedComments) {
            setCollapsedComments(true);
            setHasAutoOpened(true);
        }
    }, [hoveredAnnotations, hasAutoOpened, collapsedComments]);

    if (elements.loading) {
        return <div>Loading document elements...</div>;
    }

    if (elements.error) {
        return <div>Error: {elements.error.message}</div>;
    }

    if (!elements.data || elements.data.length === 0) {
        return <div>No document elements found.</div>;
    }

    return (
        <div 
            className='document-content-panel' 
            style={{ display: 'flex' }}
        >
            <div className='document-content-container' style={{ flex: 2 }}>
                {elements.data.map((content) => (
                    <div key={content.id} className='document-content'>
                        <HighlightedText
                            text={content.content.text}
                            annotations={annotations.data}
                            paragraphId={`DocumentElements/${content.id}`}
                            setSelectedText={(selectedText) => setSelectionInfo({
                                content_id: selectedText.content_id,
                                start: selectedText.start,
                                end: selectedText.end,
                                text: selectedText.text
                            })}
                        />
                    </div>
                ))}
            </div>
            <div 
                className={`annotations-panel ${collapsedComments ? 'open' : 'closed'}`} 
                style={{ 
                    flex: collapsedComments ? 1 : 0,
                    width: collapsedComments ? 'auto' : '0',
                    overflow: 'hidden',
                    transition: 'all 0.3s ease-in-out'
                }}
            >
                {selectionInfo.text && (
                    <AnnotationCreationCard
                        selectedText={selectionInfo.text}
                        annotationText={newAnnotationText}
                        onAnnotationTextChange={setNewAnnotationText}
                        onSave={handleCreateAnnotation}
                        onCancel={handleCancelAnnotation}
                    />
                )}
                
                {
                    hoveredAnnotations.length === 0 ? (
                        !selectionInfo.text && <p>Hover over a highlight to view annotations</p>
                    ) : (
                        hoveredAnnotations.map(annotation => (
                            <AnnotationCard
                                key={annotation.id}
                                id={`${annotation.id}`}
                                annotation={annotation}
                                isHighlighted={false}
                            />
                        ))
                    )
                }
            </div>
            
            <div className="sidebar-controls">
                <button 
                    className="sidebar-toggle-button"
                    onClick={() => setCollapsedComments(!collapsedComments)}
                    aria-label={collapsedComments ? "Show comments" : "Hide comments"}
                >
                    {collapsedComments ? <FaChevronLeft /> : <FaChevronRight />}
                </button>
            </div>
        </div>
    );
};

export default DocumentContentPanel;