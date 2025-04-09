import React, { useEffect, useState, useMemo } from 'react';
import { 
    HighlightedText,
    AnnotationsSidebar,
    MenuContext
 } from '.';
import { DocumentElement } from '@documentView/types';
import { useApiClient } from '@hooks/useApi';
import { RootState, commentingAnnotations, scholarlyAnnotations } from '@store';
import { useSelector } from 'react-redux';
// import SelectionDebugger from './SelectionDebug';

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

    // HOOKS
    const elements = useApiClient<DocumentElement[]>(`/documents/${documentID}/elements/`);
    
    const hoveredHighlightIds = useSelector(
        (state: RootState) => state.highlightRegistry.hoveredHighlightIds
    );
    
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
                        />
                    </div>
                ))}
                <MenuContext/>
            </div>
            <AnnotationsSidebar
                collapsedComments={collapsedAnnotations}
                setCollapsedComments={setCollapsedAnnotations}
                hoveredAnnotations={hoveredScholarlyAnnotations}
                motivation='scholarly'
                position='left'
            />
            <AnnotationsSidebar
                collapsedComments={collapsedComments}
                setCollapsedComments={setCollapsedComments}
                hoveredAnnotations={hoveredAnnotations}
                motivation='commenting'
                position='right'
            />
            {/* <SelectionDebugger></SelectionDebugger> */}
    </div>
    );
};

export default DocumentContentPanel;