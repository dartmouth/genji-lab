// AnnotationCard.tsx
import React, { useState } from "react";
import { 
    RootState, 
    replyingAnnotations, 
    sliceMap, 
    useAppDispatch, 
    useAppSelector  
} from "@store";
import { Annotation } from "@documentView/types";
import { ThumbUp, ChatBubbleOutline, Flag, Settings } from "@mui/icons-material";
import { Menu, MenuItem } from "@mui/material";

import { useAuth } from "../../../../hooks/useAuthContext";
import '../../styles/AnnotationCardStyles.css'

import { TagList, TagInput } from '@documentView/components'
import { useAnnotationTags } from "@documentView/hooks";

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

    return (
        <div 
            key={id} 
            className={`comment-card ${isHighlighted ? 'highlighted' : ''} ${depth > 0 ? 'reply-card-rounded' : ''} ${depth == 0 ? 'comment-card-rounded' : ''}`}
            style={{
                backgroundColor: isHighlighted ? '#c4dd88' : 'white',        
                width: `${275 - (10*depth)}px`
            }}
        >
            <div className="comment-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{`${annotation.creator.first_name} ${annotation.creator.last_name}`}</span>
                <div>
                    <button title="Upvote" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'green' }}>
                        <ThumbUp sx={{ fontSize: '1rem' }} />
                    </button>
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