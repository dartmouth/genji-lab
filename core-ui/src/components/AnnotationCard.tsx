import React, { useState } from "react";
import { RootState } from "../store/index";
import { Annotation } from "../types/annotation";
import { ThumbUp, ChatBubbleOutline, Flag, Settings } from "@mui/icons-material";
import { Menu, MenuItem } from "@mui/material";
import { replyingAnnotations, taggingAnnotations } from "../store";
import { useAppDispatch, useAppSelector } from "../store/hooks/useAppDispatch";
import { saveReplyingAnnotation, saveTaggingAnnotation, deleteTaggingAnnotations } from "../store/thunk/annotationThunks";
import { useAuth } from "../hooks/useAuthContext";
import { AnnotationCreate } from "../types/annotation";
import { makeTextAnnotationBody, parseURI } from "../functions/makeAnnotationBody";
// import { taggingAnnotations } from "../store/slice/annotationSlices";

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

    const [isTagging, setIsTagging] = useState(false);
    const [tagInput, setTagInput] = useState("");

    const replies = useAppSelector(
        (state: RootState) => replyingAnnotations.selectors.selectAnnotationsByParent(state, `Annotation/${id}`)
    );

    const tags = useAppSelector(
        (state: RootState) => taggingAnnotations.selectors.selectAnnotationsByParent(state, `Annotation/${id}`)
    );

    // 2. Add handler for the Tags menu item
    const handleTagsClick = () => {
    setIsTagging(!isTagging);
    closeMenu(); // Close the dropdown menu when Tags is clicked
    };

    const handleTagSubmit = () => {
        if (!tagInput.trim()) return;
        
        const newTags = tagInput
          .split(',')
          .map(tag => tag.trim())
          .filter(tag => tag.length > 0);
        

        if (!user) return;

        const deId = typeof annotation.document_element_id === "string"
        ? parseInt(parseURI(annotation.document_element_id))
        : annotation.document_element_id

        newTags.map((tag) => {
            const tagAnno = makeTextAnnotationBody(
                annotation.document_collection_id,
                annotation.document_id,
                deId,
                user.id,
                'tagging',
                `Annotation/${annotation.id}`,
                tag
            )

            dispatch(saveTaggingAnnotation(tagAnno))
        })
        
        setTagInput(""); // Clear the input
        // Optionally close the tag UI
        setIsTagging(false);
      };



    const toggleMenu = (event: React.MouseEvent<HTMLButtonElement>) => {
        setMenuAnchor(event.currentTarget);
    };

    const closeMenu = () => {
        setMenuAnchor(null);
    };

    const handleRemoveTag = (tagId: number | string) => {
        // Here you would dispatch an action to remove the tag
        console.log("Remove tag with ID:", tagId);
        dispatch(deleteTaggingAnnotations({'annotationId':tagId as unknown as number}))
        // Example: dispatch(removeTaggingAnnotation(tagId));
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

            {tags && tags.filter(tag => tag && tag.body).length> 0 && (
                <div className="tags-container" style={{ 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    gap: '5px',
                    marginTop: '8px' 
                }}>
                    {tags.map(tag => (
                    <div 
                        key={tag.id} 
                        className="tag-chip" 
                        style={{
                        backgroundColor: '#e0e0e0',
                        borderRadius: '16px',
                        padding: '2px 8px',
                        fontSize: '0.8rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        color: '#333'
                        }}
                    >
                        {tag.body.value}
                        <span 
                        onClick={() => handleRemoveTag(tag.id)} 
                        style={{ 
                            marginLeft: '4px', 
                            cursor: 'pointer',
                            fontWeight: 'bold'
                        }}
                        >
                        ×
                        </span>
                    </div>
                    ))}
                </div>
                )}
            
            <Menu
                anchorEl={menuAnchor}
                open={Boolean(menuAnchor)}
                onClose={closeMenu}
                disableScrollLock
            >
                <MenuItem onClick={closeMenu}>Edit</MenuItem>
                <MenuItem onClick={closeMenu}>Delete</MenuItem>
                <MenuItem onClick={handleTagsClick}>Tags</MenuItem>
            </Menu>
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

            {isTagging && (
            <div className="tag-section" style={{ marginRight: '10px', marginTop: '10px' }}>
                <div style={{ fontSize: '0.8rem', marginBottom: '5px', color: '#666' }}>
                Enter tags separated by commas
                </div>
                <input
                type="text"
                placeholder="Enter tags"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === "Enter") {
                    e.preventDefault();
                    handleTagSubmit();
                    }
                }}
                style={{
                    width: '100%',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    padding: '5px',
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
                    onClick={handleTagSubmit}
                >
                    Add Tags
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
        </div>
    );
}

export default AnnotationCard;