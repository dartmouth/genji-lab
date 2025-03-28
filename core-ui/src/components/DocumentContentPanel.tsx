import React, { useEffect, useState, useCallback, useMemo } from 'react';
import HighlightedText from './HighlightedText';
// import AnnotationCard from './AnnotationCard';
// import AnnotationCreationCard from './AnnotationCreationCard';
import { DocumentElement } from '../types/documentElement';
// import { FaChevronRight, FaChevronLeft } from 'react-icons/fa';
import { useApiClient } from '../hooks/useApi';
import { RootState } from '../store/index';
import { useDispatch, useSelector } from 'react-redux';
import { commentingAnnotations } from '../store';
import { useAnnotationCreation } from '../hooks/useAnnotationCreation';
import { scholarlyAnnotations } from '../store/slice/annotationSlices';
import AnnotationsSidebar from './AnnotationsSidebar';
import MenuContext from './MenuContext';


interface DocumentContentPanelProps {
    documentCollectionId: number;
    documentID: number;
}

const DocumentContentPanel: React.FC<DocumentContentPanelProps> = ({ 
    documentCollectionId,
    documentID,
}) => {
    // STATE
    const [collapsedComments, setCollapsedComments] = useState<boolean>(false);
    const [collapsedAnnotations, setCollapsedAnnotations] = useState<boolean>(false)
    const [hasAutoOpened, setHasAutoOpened] = useState<boolean>(false);
    // const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
    
    // Use the extracted annotation creation hook
    const {
        selectionInfo,
        setSelectionInfo,
        newAnnotationText,
        setNewAnnotationText,
        handleCreateAnnotation,
        handleCancelAnnotation,
        annotations,
        createAnnotation,
        // setCreateAnnotation,
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

    const makeSelectScholarlyAnnotationsById = useMemo(
        () => scholarlyAnnotations.selectors.makeSelectAnnotationsById(),
        []
    );
    
    const hoveredAnnotations = useSelector(
        (state: RootState) => makeSelectAnnotationsById(state, hoveredHighlightIds)
    );
    const hoveredScholarlyAnnotations = useSelector(
        (state: RootState) => makeSelectScholarlyAnnotationsById(state, hoveredHighlightIds)
    );

    useEffect(() => {
        if (hoveredAnnotations.length > 0 && !hasAutoOpened && !collapsedComments) {
            setCollapsedComments(true);
            setCollapsedAnnotations(true);
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
                            paragraphId={`DocumentElements/${content.id}`}
                            documentCollectionId={documentCollectionId}
                            documentId={documentID}
                            setSelectedText={(selectedText) => setSelectionInfo({
                                content_id: selectedText.content_id,
                                start: selectedText.start,
                                end: selectedText.end,
                                text: selectedText.text
                            })}
                        />
                    </div>
                ))}
                <MenuContext/>
            </div>
            <AnnotationsSidebar
                collapsedComments={collapsedAnnotations}
                setCollapsedComments={setCollapsedAnnotations}
                selectionInfo={scholarlyAnnotationCreate.selectionInfo}
                newAnnotationText={scholarlyAnnotationCreate.newAnnotationText}
                setNewAnnotationText={scholarlyAnnotationCreate.setNewAnnotationText}
                handleCreateAnnotation={scholarlyAnnotationCreate.handleCreateAnnotation}
                handleCancelAnnotation={scholarlyAnnotationCreate.handleCancelAnnotation}
                hoveredAnnotations={hoveredScholarlyAnnotations}
                createAnnotation={scholarlyAnnotationCreate.createAnnotation}
                motivation='scholarly'
                position='left'
            />
            <AnnotationsSidebar
                collapsedComments={collapsedComments}
                setCollapsedComments={setCollapsedComments}
                selectionInfo={selectionInfo}
                newAnnotationText={newAnnotationText}
                setNewAnnotationText={setNewAnnotationText}
                handleCreateAnnotation={handleCreateAnnotation}
                handleCancelAnnotation={handleCancelAnnotation}
                hoveredAnnotations={hoveredAnnotations}
                createAnnotation={createAnnotation}
                motivation='commenting'
                position='right'
            />
    </div>
    );
};

export default DocumentContentPanel;