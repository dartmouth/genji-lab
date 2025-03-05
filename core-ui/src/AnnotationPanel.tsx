import React from "react";
import AnnotationCard from "./AnnotationCard";

interface AnnotationPanelProps {
    someSortOFID: string;
}

const AnnotationPanel: React.FC<AnnotationPanelProps> = ({ someSortOFID }) => {
    // fetch content from server
    const content_list = [
        {
            "@context": "http://www.w3.org/ns/anno.jsonld",
            "id": "comment1",
            "type": "Annotation",
            "creator": "User1",
            "created": "2015-01-28T12:00:00Z",
            "modified": "2015-01-29T09:00:00Z",
            "generator": "http://example.org/client1",
            "generated": "2025-02-24T12:00:00Z",
            "motivation": "commenting",
            "body": {
                "id": "comment1/body",
                "type": "TextualBody",
                "value": "I guess there were lots of them?",
                "format": "text/html",
                "language": "en"
            },
            "target": [
                {
                    "id": "comment1/target",
                    "type": "Text",
                    "source": "http://example.org/page1",
                    "selector": {
                        "type": "FragmentSelector",
                        "value": "P1",
                        "refinedBy": {
                            "type": "TextPositionSelector",
                            "start": 131,
                            "end": 174
                        }
                    }
                }
            ]
        }
    ]
    
    const AnnotationCards = content_list.map((content) => (
        <AnnotationCard id={content.id} annotation={content} />
    ))

    return (
        <div className='comments-sidebar'>
            <h1>Annotations {someSortOFID}</h1>
            {AnnotationCards}
        </div>
    )

}

export default AnnotationPanel