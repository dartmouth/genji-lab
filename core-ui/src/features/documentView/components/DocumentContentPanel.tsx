import React, { useEffect, useState, useMemo } from 'react';
import { 
    HighlightedText,
    AnnotationsSidebar,
    MenuContext
} from '.';
import { 
    RootState, 
    commentingAnnotations, 
    scholarlyAnnotations,
    fetchDocumentElements,
    selectAllDocumentElements,
    selectDocumentElementsStatus,
    selectDocumentElementsError,
    selectAllDocuments,
    fetchDocumentsByCollection,
    setActiveParagraph,
    selectActiveParagraphId
} from '@store';
import { useLocation, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useAppDispatch } from '@store/hooks';
import '../styles/DocumentContentStyles.css';

const DocumentContentPanel: React.FC = () => {
    // Get route params directly in the component
    const { collectionId, documentId } = useParams<{ collectionId: string; documentId: string }>();
    const numericDocumentId = documentId ? Number(documentId) : 0;
    const numericCollectionId = collectionId ? Number(collectionId) : 0;
    
    // STATE
    const [collapsedComments, setCollapsedComments] = useState<boolean>(false);
    const [collapsedAnnotations, setCollapsedAnnotations] = useState<boolean>(false);
    const [hasAutoOpened, setHasAutoOpened] = useState<boolean>(false);
    
    // Redux
    const dispatch = useAppDispatch();
    const location = useLocation();
    
    // Get data from Redux
    const activeParagraphId = useSelector(selectActiveParagraphId);
    const elements = useSelector(selectAllDocumentElements);
    const elementsStatus = useSelector(selectDocumentElementsStatus);
    const elementsError = useSelector(selectDocumentElementsError);
    const documents = useSelector(selectAllDocuments);
    
    // Get current document from Redux
    const currentDocument = useMemo(() => 
        documents.find(doc => doc.id === numericDocumentId),
        [documents, numericDocumentId]
    );
    
    // Fetch document elements
    useEffect(() => {
        if (numericDocumentId) {
            dispatch(fetchDocumentElements(numericDocumentId));
        }
    }, [dispatch, numericDocumentId]);
    
    // Fetch documents if needed
    useEffect(() => {
        if (numericCollectionId) {
            dispatch(fetchDocumentsByCollection(numericCollectionId));
        }
    }, [dispatch, numericCollectionId]);
    
    // Sync URL hash to Redux (when URL changes)
    useEffect(() => {
        if (location.hash) {
            const paragraphId = location.hash.slice(1);
            dispatch(setActiveParagraph(paragraphId));
        } else {
            // If there's no hash, clear the active paragraph
            dispatch(setActiveParagraph(''));
        }
    }, [location.hash, dispatch]);
    
    // Scroll to active paragraph when it changes
    useEffect(() => {
        if (activeParagraphId && elements.length > 0) {
            const targetElement = document.getElementById(activeParagraphId);
            if (targetElement) {
                setTimeout(() => {
                    targetElement.scrollIntoView({ behavior: 'smooth' });
                    
                    // Add highlight effect
                    targetElement.classList.add('highlight-target');
                    setTimeout(() => targetElement.classList.remove('highlight-target'), 3000);
                }, 100);
            }
        }
    }, [activeParagraphId, elements]);
    
    // Your existing selectors
    const hoveredHighlightIds = useSelector(
        (state: RootState) => state.highlightRegistry.hoveredHighlightIds[numericDocumentId] || []
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
    
    if (elementsStatus === 'loading') {
        return <div>Loading document elements...</div>;
    }
    if (elementsStatus === 'failed') {
        return <div>Error: {elementsError}</div>;
    }
    if (!elements || elements.length === 0) {
        return <div>No document elements found.</div>;
    }
    
    return (
        <div 
            className='document-content-panel' 
            style={{ display: 'flex' }}
        >
            <div className='document-content-container' style={{ flex: 2 }}>
                {currentDocument && (
                    <h1 className="document-title">{currentDocument.title}</h1>
                )}
                {elements.map((content) => {
                    const paragraphId = `DocumentElements/${content.id}`;
                    return (
                        <div 
                            key={content.id} 
                            className={`document-content ${activeParagraphId === paragraphId ? 'active-paragraph' : ''}`}
                            id={paragraphId}
                        >
                            <HighlightedText
                                text={content.content.text}
                                paragraphId={paragraphId}
                                documentCollectionId={numericCollectionId}
                                documentId={numericDocumentId}
                            />
                        </div>
                    );
                })}
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
        </div>
    );
};

export default DocumentContentPanel;