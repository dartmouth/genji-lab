// AnnotationCard.tsx
import React, { useState } from "react";

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

import { AnnotationEditor, ReplyForm } from '.'

interface AnnotationCardProps {
    id: string;
    annotation: Annotation;
    isHighlighted?: boolean;
    depth: number
}

const AnnotationCard: React.FC<AnnotationCardProps> = ({ id, annotation, isHighlighted = false, depth=0 }) => {
    const { user } = useAuth();
    const dispatch = useAppDispatch();

    const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
    const [isReplying, setIsReplying] = useState(false);
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

        if (!slice){
            console.error("Bad motivation in update: ", motivation);
        }

        dispatch(slice.thunks.patchAnnotation({"annotationId": annotation.id as unknown as number, "payload": {"body": editText}}));
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

    const handleCommentDelete = () => {
        const motivation = annotation.motivation;
        const slice = sliceMap[motivation];

        if (!slice){
            console.error("Bad motivation in update: ", motivation);
        }
        dispatch(slice.thunks.deleteAnnotation({'annotationId': annotation.id as unknown as number}));
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

    return (
        <div 
            key={id} 
            className={`comment-card ${isHighlighted ? 'highlighted' : ''} ${depth > 0 ? 'reply-card-rounded' : ''} ${depth == 0 ? 'comment-card-rounded' : ''}`}
            style={{
                backgroundColor: isHighlighted ? '#c4dd88' : 'white',        
                width: `${275 - (10*depth)}px`
            }}
        >
            <div className="comment-header" style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center' }}>
                <span>{`${annotation.creator.first_name} ${annotation.creator.last_name}`}</span>
                
                <div>
                    <button title="Upvote" onClick={handleUpvote} disabled={hasUserUpvoted} 
                    style={{
                        background: 'none',
                        border: 'none',
                        cursor: hasUserUpvoted ? 'not-allowed' : 'pointer',
                        color: hasUserUpvoted ? '#aaa' : 'green',
                        opacity: hasUserUpvoted ? 0.5 : 1,
                        pointerEvents: hasUserUpvoted ? 'none' : 'auto' // fully prevents interaction
                    }}
                    >
                        <ThumbUp sx={{ 
                            fontSize: '1rem'
                         }} />
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
                                        // variant="outlined"
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
                        sx={{ backgroundColor: '#e0f2f1', fontWeight: 'bold', height: '24px' }} 
                    />
                    </Tooltip>
                    <button title="Reply" onClick={handleReplyClick} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'blue' }}>
                        <ChatBubbleOutline sx={{ fontSize: '1rem' }} />
                    </button>
                    <button title="Flag" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'red' }}>
                        <Flag sx={{ fontSize: '1rem' }} />
                    </button>
                    <button title="Settings" onClick={toggleMenu} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'black' }}>
                        <Settings sx={{ fontSize: '1rem' }}/>
                    </button>
                </div>
            </div>

            <div className="comment-body">{annotation.body.value}</div>

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
                {(user && user.id === annotation.creator.id) && (<MenuItem onClick={handleEditClick}>Edit</MenuItem>)}
                {(user && user.id === annotation.creator.id) && (<MenuItem onClick={handleCommentDelete}>Delete</MenuItem>)}
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

            {isReplying && (
                <ReplyForm
                    annotation={annotation}
                    onSave={() => setIsReplying(false)}
                />
            )}

            {replies && replies.length > 0 && (
                <button 
                    onClick={() => setIsCollapsed(!isCollapsed)} 
                    className="toggle-replies-button"
                >
                    {isCollapsed ? `Show ${replies.length} repl${replies.length > 1 ? 'ies' : 'y'}` : 'Hide replies'}
                </button>
            )}

            {!isCollapsed && replies && (
                replies.map(reply => (
                    <AnnotationCard
                        key={reply.id}
                        id={`${reply.id}`}
                        annotation={reply}
                        isHighlighted={false}
                        depth={depth + 1}
                    />
                ))
            )}
        </div>
    );
}

export default AnnotationCard;