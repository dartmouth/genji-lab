import React from "react";
import { Annotation } from "../types/annotation";

interface AnnotationCardProps {
    id: string;
    annotation: Annotation;
    isHighlighted?: boolean;
}


const AnnotationCard: React.FC<AnnotationCardProps> = ({ id, annotation, isHighlighted = false }) => {
    return (
        <div 
            key={id} 
            className={`comment-card ${isHighlighted ? 'highlighted' : ''}`}
            style={{
                transition: 'background-color 0.2s ease',
                backgroundColor: isHighlighted ? '#ffffd6' : 'white',
                border: '1px solid #ddd',
                borderRadius: '4px',
                padding: '10px',
                margin: '10px 0',
            }}
        >
            <div className="comment-header">{annotation.creator}</div>
            <div className="comment-body">{annotation.body.value}</div>
        </div>
    )
}

export default AnnotationCard;