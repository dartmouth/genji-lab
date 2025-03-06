// components/DocumentContentPanel.tsx
import React, { useState } from 'react';
import HighlightedText from './HighlightedText';
import AnnotationCard from './AnnotationCard';
import { Annotation } from './types/annotation';

interface DocumentContentPanelProps {
    documentID: string;
    annotations?: Annotation[];
}

const DocumentContentPanel: React.FC<DocumentContentPanelProps> = ({ 
    documentID,
    annotations = [] // Sample annotations would be passed here
}) => {
    const [hoveredAnnotationId, setHoveredAnnotationId] = useState<string | null>(null);

    // Sample content list (as in your original component)
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
    },
    {
        "id": "P2",
        "document_collection_id": "TC1",
        "hierarchy": {
            "section": 1,
            "chapter": 1,
            "paragraph": 2
        },
        "content": {
            "text": "His Majesty could see how forlorn she was",
            "formatting": []
        },
        "metadata": {
            "created": "2025-02-24T10:51:38Z",
            "modified": "2025-02-24T10:51:38Z"
        }
    }];

    // Handle highlight hover
    const handleHighlightHover = (annotationId: string | null, isHovering: boolean) => {
        if (isHovering && annotationId) {
            setHoveredAnnotationId(annotationId);
        } else {
            setHoveredAnnotationId(null);
        }
    };

    return (
        <div className='document-content-panel' style={{ display: 'flex' }}>
            <div className='document-content-container' style={{ flex: 2 }}>
                <h3>documentID: {documentID}</h3>
                {content_list.map((content) => (
                    <div key={content.id} className='document-content'>
                        <HighlightedText
                            text={content.content.text}
                            annotations={annotations}
                            paragraphId={content.id}
                            onHighlightHover={handleHighlightHover}
                        />
                    </div>
                ))}
            </div>
            
            <div className='annotations-panel' style={{ flex: 1, marginLeft: '20px' }}>
                <h3>Annotations</h3>
                {annotations.map(annotation => (
                    <AnnotationCard
                        key={annotation.id}
                        id={annotation.id}
                        annotation={annotation}
                        isHighlighted={hoveredAnnotationId === annotation.id}
                    />
                ))}
            </div>
        </div>
    );
};

export default DocumentContentPanel;