import React from 'react';
import { Annotation } from "@documentView/types";
import { TagList, TagInput } from '@documentView/components';

interface AnnotationCardContentProps {
    annotation: Annotation;
    tags: Annotation[]; 
    userId?: number; 
    isTagging: boolean;
    onRemoveTag: (tagId: string | number) => void;
    onTagSubmit: (tags: string[]) => void;
    onCloseTagging: () => void;
}

const AnnotationCardContent: React.FC<AnnotationCardContentProps> = ({
    annotation,
    tags,
    userId,
    isTagging,
    onRemoveTag,
    onTagSubmit,
    onCloseTagging
}) => {
    return (
        <>
            {/* Annotation Content */}
            <div style={{
                fontSize: '14px',
                lineHeight: 1.6,
                color: '#212529',
                marginBottom: '16px',
                whiteSpace: 'pre-wrap'
            }}>
                {annotation.body.value}
            </div>

            {/* Tags */}
            <TagList 
                tags={tags} 
                userId={userId} 
                onRemoveTag={onRemoveTag} 
            />
            
            {/* Tag Input */}
            {isTagging && (
                <TagInput 
                    onSubmit={onTagSubmit}
                    onClose={onCloseTagging}
                />
            )}
        </>
    );
};

export default AnnotationCardContent;