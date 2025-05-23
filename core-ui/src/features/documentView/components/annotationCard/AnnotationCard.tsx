// AnnotationCard.tsx - Fixed Version
import React, { useState } from "react";
import { FaBook, FaStar } from 'react-icons/fa';

import { 
    RootState, 
    replyingAnnotations, 
    upvoteAnnotations,
    sliceMap, 
    useAppDispatch, 
    useAppSelector  
} from "@store";

import { Annotation } from "@documentView/types";
import { TagList, TagInput } from '@documentView/components'
import { useAnnotationTags } from "@documentView/hooks";
import { useAuth } from "@hooks/useAuthContext";
import '@documentView/styles/AnnotationCardStyles.css'
import { parseURI, makeTextAnnotationBody } from "@documentView/utils";

import { ThumbUp, ChatBubbleOutline, Flag, Settings } from "@mui/icons-material";
import { Menu, MenuItem, Chip, Tooltip, Avatar } from "@mui/material";

import { AnnotationEditor, ReplyForm } from './'

interface AnnotationCardProps {
    id: string;
    annotation: Annotation;
    isHighlighted?: boolean;
    depth: number;
    documentColor?: string;
    documentTitle?: string;
    showDocumentInfo?: boolean;
}

const AnnotationCard: React.FC<AnnotationCardProps> = ({ 
    id, 
    annotation, 
    isHighlighted = false, 
    depth = 0,
    documentColor = '#6c757d',
    documentTitle = `Document ${annotation.document_id}`,
    showDocumentInfo = false
}) => {
    const { user } = useAuth();
    const dispatch = useAppDispatch();

    const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
    const [isReplying, setIsReplying] = useState(false);
    const [isFlagging, setIsFlagging] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(true);

    const { 
        tags, 
        isTagging, 
        setIsTagging, 
        handleTagsClick, 
        handleRemoveTag, 
        handleTagSubmit 
    } = useAnnotationTags(annotation, user?.id);

    const handleEditClick = () => {
        setIsEditing(true);
        closeMenu();
    };

    const handleEditCancel = () => {
        setIsEditing(false);
    };

    const handleEditSave = (editText: string) => {
        if (!editText.trim()) return;

        const motivation = annotation.motivation;
        const slice = sliceMap[motivation];

        if (!slice) {
            console.error("Bad motivation in update: ", motivation);
            return;
        }

        // Fix: Ensure proper type conversion for annotation ID
        dispatch(slice.thunks.patchAnnotation({
            annotationId: parseInt(annotation.id), // Convert string to number
            payload: { body: editText }
        }));
        
        setIsEditing(false);
    };

    const replies = useAppSelector(
        (state: RootState) => replyingAnnotations.selectors.selectAnnotationsByParent(state, `Annotation/${id}`)
    );

    const upvotes = useAppSelector(
        (state: RootState) => upvoteAnnotations.selectors.selectAnnotationsByParent(state, `Annotation/${id}`)
    );

    const hasUserUpvoted = !!(user?.id && upvotes?.some(u => u.creator.id === user.id));

    const handleTagsMenuClick = () => {
        handleTagsClick();
        closeMenu(); 
    };

    // Fix: Corrected delete function with proper error handling
    const handleCommentDelete = () => {
        console.log("Attempting to delete annotation:", annotation.id, "with motivation:", annotation.motivation);
        
        const motivation = annotation.motivation;
        const slice = sliceMap[motivation];

        if (!slice) {
            console.error("Bad motivation in delete: ", motivation);
            console.error("Available slices:", Object.keys(sliceMap));
            return;
        }

        if (!slice.thunks || !slice.thunks.deleteAnnotation) {
            console.error("Delete thunk not available for motivation:", motivation);
            return;
        }

        try {
            // Fix: Ensure proper type conversion for annotation ID
            dispatch(slice.thunks.deleteAnnotation({
                annotationId: parseInt(annotation.id) // Convert string to number
            }));
            console.log("Delete dispatched successfully");
        } catch (error) {
            console.error("Error dispatching delete:", error);
        }
        
        closeMenu();
    };

    const toggleMenu = (event: React.MouseEvent<HTMLButtonElement>) => {
        setMenuAnchor(event.currentTarget);
    };

    const closeMenu = () => {
        setMenuAnchor(null);
    };

    const handleReplyClick = () => {
        setIsReplying(!isReplying);
    };

    const handleFlagClick = () => {
        setIsFlagging(true)
    }
    
    const handleUpvote = () => {
        console.log("upvoting")
        if (!user) return;
        if (!user.id) return;
    
        const deId = typeof annotation.document_element_id === "string"
            ? parseInt(parseURI(annotation.document_element_id))
            : annotation.document_element_id;

        const segment = [{
            sourceURI: `Annotation/${annotation.id}`,
            start: 1,
            end: 1,
            text: ""
        }]
        
        const upvote = makeTextAnnotationBody(
            annotation.document_collection_id,
            annotation.document_id,
            deId,
            user.id,
            'upvoting',
            "Upvote",
            segment
        );
            
        dispatch(upvoteAnnotations.thunks.saveAnnotation(upvote));
    };

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

    // Fix: Add better success/error handling for reply and flag operations
    const handleReplySave = () => {
        console.log("Reply saved successfully");
        setIsReplying(false);
    };

    const handleFlagSave = () => {
        console.log("Flag submitted successfully");
        setIsFlagging(false);
    };

    return (
        <div 
            key={id} 
            style={{
                backgroundColor: isHighlighted ? '#c4dd88' : '#ffffff',
                borderRadius: '8px',
                border: '1px solid #e2e6ea',
                borderLeft: `4px solid ${documentColor}`,
                padding: '16px',
                marginBottom: depth > 0 ? '8px' : '12px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
                width: depth > 0 ? `${300 - (15*depth)}px` : '100%',
                maxWidth: '100%',
                position: 'relative',
                transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.12)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.08)';
            }}
        >
            {/* Document Info & Type Badge */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px',
                paddingRight: '120px' // Space for toolbar
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

            {/* Toolbar positioned at top right */}
            <div style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                zIndex: 2,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                padding: '4px 6px',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                backdropFilter: 'blur(4px)'
            }}>
                <button title="Upvote" onClick={handleUpvote} disabled={hasUserUpvoted} 
                style={{
                    background: 'none',
                    border: 'none',
                    cursor: hasUserUpvoted ? 'not-allowed' : 'pointer',
                    color: hasUserUpvoted ? '#aaa' : '#34A853',
                    opacity: hasUserUpvoted ? 0.5 : 1,
                    pointerEvents: hasUserUpvoted ? 'none' : 'auto',
                    padding: '4px',
                    borderRadius: '4px',
                    transition: 'all 0.2s ease'
                }}
                >
                    <ThumbUp sx={{ fontSize: '1rem' }} />
                </button>
                
                <Tooltip
                    title={
                        upvotes && upvotes.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {upvotes?.map(upvote => (
                                <Chip
                                    key={upvote.id}
                                    avatar={<Avatar>{`${upvote.creator.first_name.charAt(0)}${upvote.creator.last_name.charAt(0)}`.toUpperCase()}</Avatar>}
                                    label={`${upvote.creator.first_name} ${upvote.creator.last_name}`}
                                    size="small"
                                    color="primary"
                                />
                            ))}
                        </div>
                        ) : ""
                    }
                    arrow
                    placement="bottom-start"
                >
                <Chip 
                    label={upvotes?.length || 0} 
                    size="small" 
                    sx={{ 
                        backgroundColor: '#e0f2f1', 
                        fontWeight: 'bold', 
                        height: '24px',
                        minWidth: '28px'
                    }} 
                />
                </Tooltip>
                
                <button title="Reply" onClick={handleReplyClick} style={{ 
                    background: 'none', 
                    border: 'none', 
                    cursor: 'pointer', 
                    color: isReplying ? '#1976d2' : '#6c757d',
                    padding: '4px',
                    borderRadius: '4px',
                    transition: 'all 0.2s ease'
                }}>
                    <ChatBubbleOutline sx={{ fontSize: '1rem' }} />
                </button>
                
                <button title="Flag" onClick={handleFlagClick} style={{ 
                    background: 'none', 
                    border: 'none', 
                    cursor: 'pointer', 
                    color: isFlagging ? '#f44336' : '#6c757d',
                    padding: '4px',
                    borderRadius: '4px',
                    transition: 'all 0.2s ease'
                }}>
                    <Flag sx={{ fontSize: '1rem' }} />
                </button>
                
                <button title="Settings" onClick={toggleMenu} style={{ 
                    background: 'none', 
                    border: 'none', 
                    cursor: 'pointer', 
                    color: '#6c757d',
                    padding: '4px',
                    borderRadius: '4px',
                    transition: 'all 0.2s ease'
                }}>
                    <Settings sx={{ fontSize: '1rem' }}/>
                </button>
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

            <TagList 
                tags={tags} 
                userId={user?.id} 
                onRemoveTag={handleRemoveTag} 
            />
            
            <Menu
                anchorEl={menuAnchor}
                open={Boolean(menuAnchor)}
                onClose={closeMenu}
                disableScrollLock
            >
                {(user && user.id === annotation.creator.id) && (
                    <MenuItem onClick={handleEditClick}>Edit</MenuItem>
                )}
                {(user && user.id === annotation.creator.id) && (
                    <MenuItem onClick={handleCommentDelete}>Delete</MenuItem>
                )}
                <MenuItem onClick={handleTagsMenuClick}>Tags</MenuItem>
            </Menu>

            {isTagging && (
                <TagInput 
                    onSubmit={handleTagSubmit}
                    onClose={() => setIsTagging(false)}
                />
            )}

            {isEditing && (
                <AnnotationEditor
                    initialText={annotation.body.value}
                    onSave={handleEditSave}
                    onCancel={handleEditCancel}
                />
            )}

            {(isFlagging && !isReplying) && (
                <ReplyForm
                    annotation={annotation}
                    motivation="flagging"
                    onSave={handleFlagSave}
                />
            )}
            {(isReplying && !isFlagging) && (
                <ReplyForm
                    annotation={annotation}
                    motivation="replying"
                    onSave={handleReplySave}
                />
            )}

            {replies && replies.length > 0 && (
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
                                <AnnotationCard
                                    key={reply.id}
                                    id={`${reply.id}`}
                                    annotation={reply}
                                    isHighlighted={false}
                                    depth={depth + 1}
                                    documentColor={documentColor}
                                    documentTitle={documentTitle}
                                    showDocumentInfo={false}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default AnnotationCard;