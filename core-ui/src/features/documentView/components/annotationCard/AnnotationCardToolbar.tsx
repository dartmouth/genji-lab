import React, { useState } from 'react';
import useLocalStorage from '@/hooks/useLocalStorage';
import { 
    ThumbUp, 
    ChatBubbleOutline, 
    Flag, 
    Settings, 
    MoreVert,
    Link as LinkIcon 
} from "@mui/icons-material";
import { Menu, MenuItem, Chip, Tooltip, Avatar } from "@mui/material";
import { 
    RootState, 
    upvoteAnnotations,
    useAppDispatch, 
    useAppSelector  
} from "@store";
import { Annotation } from "@documentView/types";
import { useAuth } from "@hooks/useAuthContext";
import { parseURI, makeTextAnnotationBody } from "@documentView/utils";

interface AnnotationCardToolbarProps {
    annotation: Annotation;
    annotationId: string;
    onReplyClick: () => void;
    onFlagClick: () => void;
    onEditClick: () => void;
    onDeleteClick: () => void;
    onTagsClick: () => void;
    onLinkClick?: () => void; 
    isReplying: boolean;
    isFlagging: boolean;
    isEditing?: boolean;
    position?: 'bottom' | 'right' | 'left';
    onActionMenuOpen: (event: React.MouseEvent<HTMLButtonElement>) => void;
    actionButtonRef?: React.RefObject<HTMLButtonElement | null>;
}

const AnnotationCardToolbar: React.FC<AnnotationCardToolbarProps> = ({
    annotation,
    annotationId,
    onReplyClick,
    onFlagClick,
    onEditClick,
    onDeleteClick,
    onTagsClick,
    onLinkClick,
    isReplying,
    isFlagging,
    isEditing = false,
    position = 'bottom',
    onActionMenuOpen,
    actionButtonRef
}) => {
    const { user } = useAuth();
    const dispatch = useAppDispatch();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [activeClassroomValue, _setActiveClassroomValue] =
        useLocalStorage("active_classroom");

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [isOptedOut, _setIsOptedOut] = useLocalStorage("classroom_opted_out");
    const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

    // Get upvotes for this annotation
    const upvotes = useAppSelector(
        (state: RootState) => upvoteAnnotations.selectors.selectAnnotationsByParent(state, `Annotation/${annotationId}`)
    );

    const hasUserUpvoted = !!(user?.id && upvotes?.some(u => u.creator.id === user.id));

    const handleUpvote = () => {
        console.log("upvoting");
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
        }];
        
        const upvote = makeTextAnnotationBody(
            annotation.document_collection_id,
            annotation.document_id,
            deId,
            user.id,
            'upvoting',
            "Upvote",
            segment
        );
            
        const classId = activeClassroomValue && !isOptedOut ? activeClassroomValue : undefined;
        dispatch(upvoteAnnotations.thunks.saveAnnotation({annotation: upvote, classroomId: classId}));
    };

    const toggleMenu = (event: React.MouseEvent<HTMLButtonElement>) => {
        setMenuAnchor(event.currentTarget);
    };

    const closeMenu = () => {
        setMenuAnchor(null);
    };

    const handleEditClick = () => {
        onEditClick();
        closeMenu();
    };

    const handleDeleteClick = () => {
        onDeleteClick();
        closeMenu();
    };

    const handleTagsClick = () => {
        onTagsClick();
        closeMenu();
    };

    const handleLinkClick = () => {
        if (onLinkClick) {
            onLinkClick();
        }
        closeMenu();
    };

    // Bottom view: Full toolbar 
    if (position === 'bottom') {
        return (
            <>
                <div style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    zIndex: 'auto',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    padding: '4px 6px',
                    borderRadius: '8px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    backdropFilter: 'blur(4px)',
                    maxWidth: 'calc(100% - 24px)'
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
                    }}>
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
                    
                    <button title="Reply" onClick={onReplyClick} style={{ 
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
                    
                    <button title="Flag" onClick={onFlagClick} style={{ 
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

                    {/* Add Link button - only show for annotation creators when editing */}
                    {(isEditing && user && user.id === annotation.creator.id && onLinkClick) && (
                        <button 
                            title="Add External Link" 
                            onClick={handleLinkClick} 
                            style={{ 
                                background: 'none', 
                                border: 'none', 
                                cursor: 'pointer', 
                                color: '#1976d2',
                                padding: '4px',
                                borderRadius: '4px',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <LinkIcon sx={{ fontSize: '1rem' }} />
                        </button>
                    )}
                    
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
                        <MenuItem onClick={handleDeleteClick}>Delete</MenuItem>
                    )}
                    <MenuItem onClick={handleTagsClick}>Tags</MenuItem>
                    {/* Add Link option in menu - only for annotation creators */}
                    {onLinkClick && user && user.id === annotation.creator.id && (
                        <MenuItem onClick={handleLinkClick}>
                            <LinkIcon sx={{ fontSize: '1rem', marginRight: '8px' }} />
                            Add Link
                        </MenuItem>
                    )}
                </Menu>
            </>
        );
    }

    // Side panels: Single menu button with everything inside
    return (
        <div style={{
            position: 'absolute',
            top: '12px',
            right: '12px', 
            zIndex: 'auto'
        }}>
            <button 
                ref={actionButtonRef}
                title="Actions" 
                onClick={onActionMenuOpen}
                style={{ 
                    background: 'rgba(255, 255, 255, 0.95)', 
                    border: 'none',
                    cursor: 'pointer', 
                    color: '#6c757d',
                    padding: '4px',
                    borderRadius: '50%',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    backdropFilter: 'blur(4px)',
                    transition: 'all 0.2s ease',
                    width: '24px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            >
                <MoreVert sx={{ fontSize: '0.875rem' }}/> 
            </button>
        </div>
    );
};

export default AnnotationCardToolbar;