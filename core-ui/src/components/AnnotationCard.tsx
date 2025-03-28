import React, { useState } from "react";
import { RootState } from "../store/index";
import { Annotation } from "../types/annotation";
import { ThumbUp, ChatBubbleOutline, Flag, Settings } from "@mui/icons-material";
import { Menu, MenuItem } from "@mui/material";
import { replyingAnnotations } from "../store";
import { useAppSelector } from "../store/hooks/useAppDispatch";

interface AnnotationCardProps {
    id: string;
    annotation: Annotation;
    isHighlighted?: boolean;
    depth: number
}

const AnnotationCard: React.FC<AnnotationCardProps> = ({ id, annotation, isHighlighted = false, depth=0 }) => {
    const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
    const [isReplying, setIsReplying] = useState(false);
    const [replyText, setReplyText] = useState("");

    const toggleMenu = (event: React.MouseEvent<HTMLButtonElement>) => {
        setMenuAnchor(event.currentTarget);
    };

    const closeMenu = () => {
        setMenuAnchor(null);
    };
    
    const replies = useAppSelector(
        (state: RootState) => replyingAnnotations.selectors.selectAnnotationsByParent(state, `Annotation/${id}`)
    );

    const handleReplyClick = () => {
        setIsReplying(!isReplying);
    }

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
            
            <Menu
                anchorEl={menuAnchor}
                open={Boolean(menuAnchor)}
                onClose={closeMenu}
                disableScrollLock
            >
                <MenuItem onClick={closeMenu}>Edit</MenuItem>
                <MenuItem onClick={closeMenu}>Delete</MenuItem>
                <MenuItem onClick={closeMenu}>Tags</MenuItem>
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

            {isReplying && (
                <div className="reply-section" style={{ marginRight: '10px', marginTop: '10px' }}>
                    <textarea
                        placeholder="Write your reply..."
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        rows={3}
                        style={{
                            width: '100%',
                            border: '1px solid #ccc',
                            borderRadius: '4px',
                            padding: '5px',
                            resize: 'none',
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
                                console.log('Submit reply:', replyText);
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