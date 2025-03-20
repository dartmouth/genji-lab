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
    const [tagsMenuAnchor, setTagsMenuAnchor] = useState<null | HTMLElement>(null);
    const [flagMenuAnchor, setFlagMenuAnchor] = useState<null | HTMLElement>(null); // State for Flag submenu

    const toggleMenu = (event: React.MouseEvent<HTMLButtonElement>) => {
        setMenuAnchor(event.currentTarget);
    };

    const closeMenu = () => {
        setMenuAnchor(null);
        setTagsMenuAnchor(null);
        setFlagMenuAnchor(null);
    };

    const openTagsMenu = (event: React.MouseEvent<HTMLLIElement>) => {
        setTagsMenuAnchor(event.currentTarget);
    };

    const openFlagMenu = (event: React.MouseEvent<HTMLLIElement>) => {
        setFlagMenuAnchor(event.currentTarget);
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
                position: 'relative'
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
                    <button title="Flag" onClick={openFlagMenu} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'red' }}>
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
                <MenuItem onClick={openTagsMenu}>Tags  ⋮</MenuItem>
            </Menu>

            <Menu
                anchorEl={tagsMenuAnchor}
                open={Boolean(tagsMenuAnchor)}
                onClose={closeMenu}
                disableScrollLock
            >
                <MenuItem onClick={closeMenu}>Important</MenuItem>
                <MenuItem onClick={closeMenu}>Reviewed</MenuItem>
                <MenuItem onClick={closeMenu}>Needs Revision</MenuItem>
                <MenuItem onClick={closeMenu}>Research</MenuItem>
                <MenuItem onClick={closeMenu}>Reference</MenuItem>
            </Menu>

            <Menu
                anchorEl={flagMenuAnchor}
                open={Boolean(flagMenuAnchor)}
                onClose={closeMenu}
                disableScrollLock
            >
                <MenuItem onClick={closeMenu}>Offensive</MenuItem>
                <MenuItem onClick={closeMenu}>Misinformation</MenuItem>
                <MenuItem onClick={closeMenu}>Plagiarism</MenuItem>
                <MenuItem onClick={closeMenu}>Off-Topic</MenuItem>
            </Menu>
        </div>
    );
}

export default AnnotationCard;
