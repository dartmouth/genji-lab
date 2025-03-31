import React, { useState } from "react";
import { RootState } from "../store/index";
import { Annotation } from "../types/annotation";
import { ThumbUp, ChatBubbleOutline, Flag, Settings } from "@mui/icons-material";
import { Menu, MenuItem } from "@mui/material";
import { replyingAnnotations } from "../store";
import { useAppDispatch, useAppSelector } from "../store/hooks/useAppDispatch";
import { saveReplyingAnnotation } from "../store/thunk/annotationThunks";
import { useAuth } from "../hooks/useAuthContext";
import { AnnotationCreate } from "../types/annotation";
import { parseURI } from "../functions/makeAnnotationBody";
import { thunkMap } from "../store/thunk/annotationThunks";
import TagList from "./TagList";
import TagInput from "./TagInput";
import { useAnnotationTags } from "../hooks/useAnnotationTags";

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
    const [replyText, setReplyText] = useState("");

    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState("");

    const { 
        tags, 
        isTagging, 
        setIsTagging, 
        handleTagsClick, 
        handleRemoveTag, 
        handleTagSubmit 
    } = useAnnotationTags(annotation, user?.id);

    const handleEditClick = () => {
        setEditText(annotation.body.value);
        setIsEditing(true);
        closeMenu();
    };

    const handleEditCancel = () => {
        setIsEditing(false);
        setEditText("");
    };

    const handleEditSave = () => {
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

    const onReplySave = () => {
        if (!replyText.trim()) return;
        if (!user) return;
    
        const replyPayload: AnnotationCreate = {
          creator_id: user.id,
          context: "http://www.w3.org/ns/anno.jsonld",
          document_id: annotation.document_id,
          type: "Annotation",
          generator: "web-client",
          document_collection_id: annotation.document_collection_id,
          document_element_id: typeof annotation.document_element_id === "string"
            ? parseInt(parseURI(annotation.document_element_id))
            : annotation.document_element_id,
          motivation: "replying",
          annotation_type: "reply",
          body: {
            type: "TextualBody",
            value: replyText,
            format: "text/html",
            language: "en"
          },
          target: [
            {
              type: "Text",
              source: `Annotation/${annotation.id}`
            }
          ]
        };
    
        dispatch(saveReplyingAnnotation(replyPayload));
        setReplyText("");
        setIsReplying(false);
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
                <div className="edit-section" style={{ marginRight: '10px', marginTop: '10px' }}>
                    <textarea
                        placeholder="Edit your annotation..."
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleEditSave();
                            }
                        }}
                        rows={3}
                        style={{
                            width: '100%',
                            border: '1px solid #ccc',
                            borderRadius: '4px',
                            padding: '5px',
                            resize: 'none',
                            fontFamily: 'Arial, Helvetica, sans-serif'
                        }}
                    />
                    <div style={{ marginTop: '5px', display: 'flex', justifyContent: 'space-between' }}>
                        <button
                            style={{
                                padding: '5px 10px',
                                backgroundColor: '#6c757d',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                            }}
                            onClick={handleEditCancel}
                        >
                            Cancel
                        </button>
                        <button
                            style={{
                                padding: '5px 10px',
                                backgroundColor: '#007bff',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                            }}
                            onClick={handleEditSave}
                        >
                            Save
                        </button>
                    </div>
                </div>
            )}

            {isReplying && (
                <div className="reply-section" style={{ marginRight: '10px', marginTop: '10px' }}>
                    <textarea
                        placeholder="Write your reply..."
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              onReplySave();
                            }
                          }}
                        rows={3}
                        style={{
                            width: '100%',
                            border: '1px solid #ccc',
                            borderRadius: '4px',
                            padding: '5px',
                            resize: 'none',
                            fontFamily: 'Arial, Helvetica, sans-serif'
                        }}
                    />
                    <div style={{ marginTop: '5px', display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                            style={{
                                padding: '5px 10px',
                                backgroundColor: '#007bff',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                            }}
                            onClick={() => {
                                onReplySave();
                            }}
                        >
                            Submit
                        </button>
                    </div>
                </div>
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