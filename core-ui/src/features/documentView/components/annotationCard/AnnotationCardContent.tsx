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
    // Function to parse and render markdown links
    const renderContentWithLinks = (content: string) => {
        const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
        const parts = [];
        let lastIndex = 0;
        let match;

        while ((match = linkRegex.exec(content)) !== null) {
            const [fullMatch, linkText, url] = match;
            const matchStart = match.index;

            // Add text before the link
            if (matchStart > lastIndex) {
                parts.push(content.substring(lastIndex, matchStart));
            }

            // Add the link as a clickable element
            parts.push(
                <a
                    key={`link-${matchStart}`}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                        color: '#1976d2',
                        textDecoration: 'underline',
                        cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.color = '#1565c0';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.color = '#1976d2';
                    }}
                >
                    {linkText}
                </a>
            );

            lastIndex = matchStart + fullMatch.length;
        }

        // Add remaining text after the last link
        if (lastIndex < content.length) {
            parts.push(content.substring(lastIndex));
        }

        return parts.length > 0 ? parts : [content];
    };

    const renderedContent = renderContentWithLinks(annotation.body.value);

    return (
        <>
            {/* Annotation Content with Link Support */}
            <div style={{
                fontSize: '14px',
                lineHeight: 1.6,
                color: '#212529',
                marginBottom: '16px',
                whiteSpace: 'pre-wrap'
            }}>
                {renderedContent.map((part, index) => (
                    <React.Fragment key={index}>
                        {part}
                    </React.Fragment>
                ))}
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