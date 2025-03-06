// DocumentContentPanel.tsx
import React, { useEffect, useState } from 'react';
import HighlightedText from './HighlightedText';
import AnnotationCard from './AnnotationCard';
import AnnotationCreationCard from './AnnotationCreationCard';
import { Annotation } from './types/annotation';

interface DocumentContentPanelProps {
    documentID: string;
    annotations?: Annotation[];
}

const DocumentContentPanel: React.FC<DocumentContentPanelProps> = ({ 
    documentID,
    annotations = []
}) => {
    const [hoveredAnnotationId, setHoveredAnnotationId] = useState<string | null>(null);
    const [selectionInfo, setSelectionInfo] = useState({
        content_id: "",
        start: 0,
        end: 0,
        text: ""
    });
    const [newAnnotationText, setNewAnnotationText] = useState("");
    const [localAnnotations, setLocalAnnotations] = useState<Annotation[]>(annotations);
    
    // Reset annotation text when selection changes
    useEffect(() => {
        if (selectionInfo.text) {
            setNewAnnotationText("");
        }
    }, [selectionInfo]);
    
    const handleHighlightHover = (annotationId: string | null, isHovering: boolean) => {
        if (isHovering && annotationId) {
            setHoveredAnnotationId(annotationId);
        } else {
            setHoveredAnnotationId(null);
        }
    };
    
    const handleCreateAnnotation = () => {
        if (!selectionInfo.text || !newAnnotationText) return;
        
        const now = new Date().toISOString();
        const newAnnotation: Annotation = {
            "@context": "http://www.w3.org/ns/anno.jsonld",
            "id": `annotation-${Date.now()}`,
            "type": "Annotation",
            "creator": "current-user", // This would be the actual user ID
            "created": now,
            "modified": now,
            "generator": "web-client",
            "generated": now,
            "motivation": "commenting",
            "body": {
                "id": `body-${Date.now()}`,
                "type": "TextualBody",
                "value": newAnnotationText,
                "format": "text/plain",
                "language": "en"
            },
            "target": [{
                "id": `target-${selectionInfo.content_id}-${Date.now()}`,
                "type": "Text",
                "source": selectionInfo.content_id,
                "selector": {
                    "type": "TextQuoteSelector",
                    "value": selectionInfo.text,
                    "refinedBy": {
                        "type": "TextPositionSelector",
                        "start": selectionInfo.start,
                        "end": selectionInfo.end
                    }
                }
            }]
        };
        
        // Add the new annotation to our local state
        setLocalAnnotations([...localAnnotations, newAnnotation]);
        
        // Clear the selection and annotation text
        setSelectionInfo({
            content_id: "",
            start: 0,
            end: 0,
            text: ""
        });
        setNewAnnotationText("");
        
        // Here you would typically also send the annotation to your backend
        // saveAnnotationToServer(newAnnotation);
    };
    
    const handleCancelAnnotation = () => {
        setSelectionInfo({
            content_id: "",
            start: 0,
            end: 0,
            text: ""
        });
        setNewAnnotationText("");
    };
    
    // Sample content list
    const content_list = [{
        "id": "P1",
        "document_collection_id": "TC1",
        "hierarchy": {
            "section": 1,
            "chapter": 1,
            "paragraph": 1
          },
        "content": {
            "text": "IN WHOSE reign was it that a woman of rather undistinguished lineage captured the heart of the Emperor and enjoyed his favor above all the other imperial wives and concubines? blah blah",
            "formatting": []
        },
        "metadata": {
            "created": "2025-02-24T10:51:38Z",
            "modified": "2025-02-24T10:51:38Z"
        }
    }];
    
    return (
        <div className='document-content-panel' style={{ display: 'flex' }}>
            <div className='document-content-container' style={{ flex: 2 }}>
                <h3>documentID: {documentID}</h3>
                {content_list.map((content) => (
                    <div key={content.id} className='document-content'>
                        <HighlightedText
                            text={content.content.text}
                            annotations={localAnnotations}
                            paragraphId={content.id}
                            setSelectedText={(selectedText) => setSelectionInfo({
                                content_id: selectedText.content_id,
                                start: selectedText.start,
                                end: selectedText.end,
                                text: selectedText.text
                            })}
                            onHighlightHover={handleHighlightHover}
                        />
                    </div>
                ))}
            </div>
            
            <div className='annotations-panel' style={{ flex: 1, marginLeft: '20px' }}>
                <h3>Annotations</h3>
                
                {/* Annotation Creation Card - Now as a separate component */}

                
                {/* Existing Annotations */}
                {localAnnotations.length === 0 ? (
                    !selectionInfo.text && <p>No annotations yet.</p>
                ) : (
                    localAnnotations.map(annotation => (
                        <AnnotationCard
                            key={annotation.id}
                            id={annotation.id}
                            annotation={annotation}
                            isHighlighted={hoveredAnnotationId === annotation.id}
                        />
                    ))
                )}

                {selectionInfo.text && (
                    <AnnotationCreationCard
                        selectedText={selectionInfo.text}
                        annotationText={newAnnotationText}
                        onAnnotationTextChange={setNewAnnotationText}
                        onSave={handleCreateAnnotation}
                        onCancel={handleCancelAnnotation}
                    />
                )}
            </div>
        </div>
    );
};

export default DocumentContentPanel;