import React, { useState } from "react";
import { Annotation } from "../types/annotation";
import { ThumbUp, ChatBubbleOutline, Flag, Settings } from "@mui/icons-material";
import { Menu, MenuItem } from "@mui/material";

interface AnnotationCardProps {
    id: string;
    annotation: Annotation;
    isHighlighted?: boolean;
}

const AnnotationCard: React.FC<AnnotationCardProps> = ({ id, annotation, isHighlighted = false }) => {
    const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

    const toggleMenu = (event: React.MouseEvent<HTMLButtonElement>) => {
        setMenuAnchor(event.currentTarget);
    };

    const closeMenu = () => {
        setMenuAnchor(null);
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
                width: '275px'
            }}
        >
            <div className="comment-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{`${annotation.creator.first_name} ${annotation.creator.last_name}`}</span>
                <div>
                    <button title="Upvote" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'green' }}>
                        <ThumbUp fontSize='1rem' />
                    </button>
                    <button title="Reply" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'blue' }}>
                        <ChatBubbleOutline fontSize='1rem' />
                    </button>
                    <button title="Flag" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'red' }}>
                        <Flag fontSize='1rem' />
                    </button>
                    <button title="Settings" onClick={toggleMenu} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'black' }}>
                        <Settings fontSize='1rem' />
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
        </div>
    );
}

export default AnnotationCard;
