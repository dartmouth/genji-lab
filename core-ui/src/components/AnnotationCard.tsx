// AnnotationCard.tsx
import React, { useState } from "react";
import { RootState } from "../store/index";
import { Annotation } from "../types/annotation";
import { ThumbUp, ChatBubbleOutline, Flag, Settings } from "@mui/icons-material";
import { Menu, MenuItem } from "@mui/material";
import { replyingAnnotations } from "../store";
import { useAppDispatch, useAppSelector } from "../store/hooks/useAppDispatch";
import { useAuth } from "../hooks/useAuthContext";
import { thunkMap } from "../store/thunk/annotationThunks";
import TagList from "./TagList";
import TagInput from "./TagInput";
import { useAnnotationTags } from "../hooks/useAnnotationTags";
import ReplyForm from "./AnnotationReplyForm";
import AnnotationEditor from "./AnnotationEditorInterface";

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
        const thunk = thunkMap[motivation];

        if (!thunk){
            console.error("Bad motivation in update: ", motivation);
        }

        dispatch(thunk.update({"annotationId": annotation.id as unknown as number, "payload": {"body": editText}}));
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
        const thunk = thunkMap[motivation];
        if (!thunk) {
            console.error("Bad motivation in handle comment delete:", motivation);
            return;
        }
        dispatch(thunk.delete({'annotationId': annotation.id as unknown as number}));
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
            className={`comment-card ${isHighlighted ? 'highlighted' : ''}`}
            style={{
                transition: 'background-color 0.2s ease',
                backgroundColor: isHighlighted ? '#c4dd88' : 'white',
                border: '1px solid #ddd',
                borderRadius: '4px',
                padding: '10px',
                margin: '10px 0',
                position: 'relative',
                width: `${275 - (25*depth)}px`
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

            {
                replies && (
                    replies.map(reply => (
                        <AnnotationCard
                            key={reply.id}
                            id={`${reply.id}`}
                            annotation={reply}
                            isHighlighted={false}
                            depth={depth+1}
                        />
                    ))
                )
            }
        </div>
    );
}

export default AnnotationCard;