import React, { useEffect, useState, useCallback, useMemo } from 'react';
import HighlightedText from './HighlightedText';
import AnnotationCard from './AnnotationCard';
import AnnotationCreationCard from './AnnotationCreationCard';
import { Annotation, AnnotationCreate } from '../types/annotation';
import { DocumentElement } from '../types/documentElement';
import { FaChevronRight, FaChevronLeft } from 'react-icons/fa';
import { useApiClient } from '../hooks/useApi';
import { useAuth } from '../hooks/useAuthContext';
import { makeSelectAnnotationsById } from '../store/annotationSlice';
import { RootState } from '../store/index'
import { useDispatch, useSelector } from 'react-redux';
import { addAnnotations } from '../store';

interface DocumentContentPanelProps {
    documentID: number;
}

const DocumentContentPanel: React.FC<DocumentContentPanelProps> = ({ 
    documentID,
}) => {
    const { user, isAuthenticated } = useAuth();
    const [collapsedComments, setCollapsedComments] = useState<boolean>(false);


    const [selectionInfo, setSelectionInfo] = useState({
        content_id: 0,
        start: 0,
        end: 0,
        text: ""
    });
    const [newAnnotationText, setNewAnnotationText] = useState("");
    const annotations = useApiClient<Annotation[]>("/annotations/");
    const elements = useApiClient<DocumentElement[]>(`/documents/${documentID}/elements/`);

    const dispatch = useDispatch();
    const dispatchAnnotationsMemo = useCallback(() => {
        dispatch(addAnnotations(annotations.data))
    }, [dispatch, annotations.data])

    useEffect(() => {
        dispatchAnnotationsMemo()
    }, [dispatchAnnotationsMemo])

    useEffect(() => {
        if (selectionInfo.text) {
            setNewAnnotationText("");
        }
    }, [selectionInfo]);
    const hoveredHighlightIds = useSelector(
        (state: RootState) => state.highlightRegistry.hoveredHighlightIds
      );

    const selectAnnotationsByIdMemo = useMemo(makeSelectAnnotationsById, []);

    const hoveredAnnotations = useSelector(
        (state: RootState) => selectAnnotationsByIdMemo(state, hoveredHighlightIds)
      );
    
      const [hasAutoOpened, setHasAutoOpened] = useState<boolean>(false);

      useEffect(() => {
        if (hoveredAnnotations.length > 0 && !hasAutoOpened && !collapsedComments) {
          setCollapsedComments(true);
          setHasAutoOpened(true);
        }
      }, [hoveredAnnotations, hasAutoOpened, collapsedComments]);
    
    const handleCreateAnnotation = async () => {
        if (!selectionInfo.text || !newAnnotationText) return;
        if (!user || !isAuthenticated) return;

        const newAnnotation: AnnotationCreate = {
            "context": "http://www.w3.org/ns/anno.jsonld",
            "document_collection_id": 1,
            "document_id": documentID,
            "document_element_id": selectionInfo.content_id,
            "type": "Annotation",
            "creator_id": user.id, 
            "generator": "web-client",
            "motivation": "commenting",
            "annotation_type": "comment",
            "body": {
                "type": "TextualBody",
                "value": newAnnotationText,
                "format": "text/plain",
                "language": "en"
            },
            "target": [{
                "type": "Text",
                "source": selectionInfo.content_id,
                "selector": {
                    "type": "TextQuoteSelector",
                    "value": selectionInfo.text,
                    "refined_by": {
                        "type": "TextPositionSelector",
                        "start": selectionInfo.start,
                        "end": selectionInfo.end
                    }
                }
            }]
        };
        try {
            await annotations.post(newAnnotation)
                .then(() => annotations.get());
            
            console.log("Annotation created and data refreshed");
            
            setSelectionInfo({
                content_id: 0,
                start: 0,
                end: 0,
                text: ""
            });
            setNewAnnotationText("");
        } catch (error) {
            console.error("Error creating annotation:", error);
        }
    };
    
    const handleCancelAnnotation = () => {
        setSelectionInfo({
            content_id: 0,
            start: 0,
            end: 0,
            text: ""
        });
        setNewAnnotationText("");
    };

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
                            paragraphId={content.id}
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