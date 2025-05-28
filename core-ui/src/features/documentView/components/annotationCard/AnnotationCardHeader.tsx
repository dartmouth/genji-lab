import React from 'react';
import { FaBook, FaStar } from 'react-icons/fa';
import { Annotation } from "@documentView/types";

interface AnnotationCardHeaderProps {
    annotation: Annotation;
    documentColor: string;
    documentTitle: string;
    showDocumentInfo: boolean;
}

const AnnotationCardHeader: React.FC<AnnotationCardHeaderProps> = ({
    annotation,
    documentColor,
    documentTitle,
    showDocumentInfo
}) => {
    
    // Render annotation type indicator
    const renderAnnotationTypeIndicator = () => {
        if (annotation.motivation === 'scholarly') {
            return (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '12px',
                    color: documentColor,
                    fontWeight: 500
                }}>
                    <FaStar style={{ fontSize: '10px' }} />
                    <span>Scholarly</span>
                </div>
            );
        }
        return null;
    };

    return (
        <>
            {/* Document Info & Type Badge */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px',
                paddingRight: '120px'
            }}>
                {showDocumentInfo && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '12px',
                        color: documentColor,
                        fontWeight: 500,
                        backgroundColor: `${documentColor}15`,
                        padding: '4px 8px',
                        borderRadius: '12px',
                        border: `1px solid ${documentColor}40`
                    }}>
                        <FaBook style={{ fontSize: '10px' }} />
                        {documentTitle}
                    </div>
                )}
                {renderAnnotationTypeIndicator()}
            </div>

            {/* Author Information */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '12px'
            }}>
                <div style={{
                    backgroundColor: documentColor,
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: '12px',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#ffffff',
                    boxShadow: `0 2px 4px ${documentColor}40`
                }}>
                    {`${annotation.creator.first_name.charAt(0)}${annotation.creator.last_name.charAt(0)}`.toUpperCase()}
                </div>
                <div>
                    <div style={{
                        fontSize: '14px',
                        fontWeight: 600,
                        color: '#212529'
                    }}>
                        {`${annotation.creator.first_name} ${annotation.creator.last_name}`}
                    </div>
                    <div style={{
                        fontSize: '12px',
                        color: '#6c757d'
                    }}>
                        {new Date(annotation.created).toLocaleDateString()}
                    </div>
                </div>
            </div>
        </>
    );
};

export default AnnotationCardHeader;