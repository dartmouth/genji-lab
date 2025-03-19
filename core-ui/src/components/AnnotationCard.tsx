import React from "react";
import { Annotation } from "../types/annotation";
import { FaThumbsUp, FaComment, FaFlag, FaCog } from "react-icons/fa";
// import { useApiClient } from "../hooks/useApi";


interface AnnotationCardProps {
    id: string;
    annotation: Annotation;
    isHighlighted?: boolean;
}


const AnnotationCard: React.FC<AnnotationCardProps> = ({ id, annotation, isHighlighted = false }) => {
    // const [settings, showSettings] = useState(false);
    // let annotation_api = useApiClient();

    return (
        <div 
            key={id} 
            className={`comment-card ${isHighlighted ? 'highlighted' : ''}`}
            style={{
                transition: 'background-color 0.2s ease',
                backgroundColor: isHighlighted ? '#c4dd88' : 'white',
                border: '1px solid #ddd',
                borderRadius: '4px',
                padding: '10px',
                margin: '10px 0',
            }}
        >
            <div className="comment-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{`${annotation.creator.first_name} ${annotation.creator.last_name}`}</span>
                <div>
                    <button title="Upvote" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'green' }}>
                        <FaThumbsUp />
                    </button>
                    <button title="Reply" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'blue' }}>
                        <FaComment />
                    </button>
                    <button title="Flag" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'red' }}>
                        <FaFlag />
                    </button>
                    <button title="Settings" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'black' }}>
                        <FaCog />
                    </button>
                </div>
            </div>
            <div className="comment-body">{annotation.body.value}</div>
        </div>    
    )
}

export default AnnotationCard;