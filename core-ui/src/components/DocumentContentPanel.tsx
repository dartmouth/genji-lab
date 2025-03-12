// DocumentContentPanel.tsx
import React, { useEffect, useState } from 'react';
import HighlightedText from './HighlightedText';
import AnnotationCard from './AnnotationCard';
import AnnotationCreationCard from './AnnotationCreationCard';
import { Annotation, DocumentElement } from '../types/annotation';
// import { useApi } from '../hooks/useApi';
import { useApiClient } from '../hooks/useApi';
import { useAuth } from '../hooks/useAuthContext'

interface DocumentContentPanelProps {
    documentID: number;
}

const DocumentContentPanel: React.FC<DocumentContentPanelProps> = ({ 
    documentID,
}) => {
    const [hoveredAnnotationId, setHoveredAnnotationId] = useState<string | null>(null);
    const { user, isAuthenticated } = useAuth();

    const [selectionInfo, setSelectionInfo] = useState({
        content_id: 0,
        start: 0,
        end: 0,
        text: ""
    });
    const [newAnnotationText, setNewAnnotationText] = useState("");
    const annotations = useApiClient<Annotation[]>("/annotations/")
    // const [localAnnotations, setLocalAnnotations] = useState<Annotation[]>(annotations);
    // const {data, loading, error } = useApi<DocumentElement[]>('/elements/')
    const elements = useApiClient<DocumentElement[]>(`/documents/${documentID}/elements/`)

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
            "creator": {
                "first_name": "Current",
                "last_name": "User",
                "id": -1,
                "user_metadata": {
                    "role": "placeholder",
                    "affiliation": "None"
                }
            }, // This would be the actual user ID
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
                    "refined_by": {
                        "type": "TextPositionSelector",
                        "start": selectionInfo.start,
                        "end": selectionInfo.end
                    }
                }
            }]
        };
        console.log(newAnnotation)
        
        // Add the new annotation to our local state
        // setLocalAnnotations([...localAnnotations, newAnnotation]);
        
        // Clear the selection and annotation text
        setSelectionInfo({
            content_id: 0,
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
    
      // Handle error state
      if (elements.error) {
        return <div>Error: {elements.error.message}</div>;
      }
    
      // Handle empty data
      if (!elements.data || elements.data.length === 0) {
        return <div>No document elements found.</div>;
    }
    
    return (
        <div className='document-content-panel' style={{ display: 'flex' }}>
        {isAuthenticated && user && (
          <div className="document-user-info">
            <p>Viewing as: {user.first_name} {user.last_name}</p>
            <p>User ID: {user.id}</p>
          </div>
        )}
            <div className='document-content-container' style={{ flex: 2 }}>
                {/* <h3>documentID: {documentID}</h3> */}
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
                            onHighlightHover={handleHighlightHover}
                        />
                    </div>
                ))}
            </div>
            
            <div className='annotations-panel' style={{ flex: 1, marginLeft: '20px' }}>
                <h3>Annotations</h3>
                
                {/* Annotation Creation Card - Now as a separate component */}

                
                {/* Existing Annotations */}
                {annotations.data.length === 0 ? (
                    !selectionInfo.text && <p>No annotations yet.</p>
                ) : (
                    annotations.data.map(annotation => (
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