import React, { useState } from 'react';
import { Annotation } from "@documentView/types";

// Define the exact props interface that AnnotationCard expects
interface AnnotationCardProps {
    id: string;
    annotation: Annotation;
    isHighlighted?: boolean;
    depth: number;
    documentColor?: string;
    documentTitle?: string;
    showDocumentInfo?: boolean;
    position?: 'bottom' | 'right' | 'left'; 
}

interface AnnotationCardRepliesProps {
    replies: Annotation[];
    depth: number;
    documentColor: string;
    documentTitle: string;
    AnnotationCardComponent: React.ComponentType<AnnotationCardProps>;
    position?: 'bottom' | 'right' | 'left'; 
}

const AnnotationCardReplies: React.FC<AnnotationCardRepliesProps> = ({
    replies,
    depth,
    documentColor,
    documentTitle,
    AnnotationCardComponent,
    position = 'bottom' 
}) => {
    const [isCollapsed, setIsCollapsed] = useState(true);

    if (!replies || replies.length === 0) {
        return null;
    }

    return (
        <div style={{ marginTop: '16px' }}>
            <button 
                onClick={() => setIsCollapsed(!isCollapsed)} 
                style={{
                    background: 'none',
                    border: `1px solid ${documentColor}`,
                    borderRadius: '20px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    color: documentColor,
                    cursor: 'pointer',
                    fontWeight: 500,
                    transition: 'all 0.2s ease',
                    marginBottom: '8px'
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = documentColor;
                    e.currentTarget.style.color = '#ffffff';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = documentColor;
                }}
            >
                {isCollapsed ? `Show ${replies.length} repl${replies.length > 1 ? 'ies' : 'y'}` : 'Hide replies'}
            </button>

            {!isCollapsed && replies && (
                <div style={{ paddingLeft: '16px' }}>
                    {replies.map(reply => (
                        <AnnotationCardComponent
                            key={reply.id}
                            id={`${reply.id}`}
                            annotation={reply}
                            isHighlighted={false}
                            depth={depth + 1}
                            documentColor={documentColor}
                            documentTitle={documentTitle}
                            showDocumentInfo={false}
                            position={position} 
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default AnnotationCardReplies;