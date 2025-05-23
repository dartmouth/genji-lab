import React, { useState } from 'react';
import { ThumbUp, ChatBubbleOutline, Flag, Settings } from "@mui/icons-material";
import { Menu, MenuItem, Chip, Tooltip, Avatar } from "@mui/material";
import { Annotation } from "@documentView/types/annotation";

// Use the creator type from Annotation interface
type User = Annotation['creator'];

export interface AnnotationToolbarProps {
  annotation: Annotation;
  upvotes: Annotation[];
  isReplying: boolean;
  isFlagging: boolean;
  isAuthor: boolean;
  user: User | null;
  onReplyClick: () => void;
  onFlagClick: () => void;
  onEditClick: () => void;
  onDeleteClick: () => void;
  onTagsClick: () => void;
  onUpvote: () => void;
}

const AnnotationToolbar: React.FC<AnnotationToolbarProps> = ({
  annotation,
  upvotes,
  isReplying,
  isFlagging,
  isAuthor,
  user,
  onReplyClick,
  onFlagClick,
  onEditClick,
  onDeleteClick,
  onTagsClick,
  onUpvote
}) => {
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);

  // Check if user has upvoted
  const hasUserUpvoted = !!(user?.id && upvotes.some((upvote: Annotation) => upvote.creator?.id === user.id));

  const toggleMenu = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setMenuAnchor(menuAnchor ? null : event.currentTarget);
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

  return (
    <div style={{
      position: 'absolute',
      top: '8px',
      right: '8px',
      zIndex: 2,
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      backgroundColor: 'rgba(255, 255, 255, 0.85)',
      padding: '2px 4px',
      borderRadius: '4px',
      boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
    }}>
      {/* Upvote Button */}
      <button 
        title="Upvote" 
        onClick={onUpvote} 
        disabled={hasUserUpvoted} 
        style={{
          background: 'none',
          border: 'none',
          cursor: hasUserUpvoted ? 'not-allowed' : 'pointer',
          color: hasUserUpvoted ? '#aaa' : '#34A853',
          opacity: hasUserUpvoted ? 0.5 : 1,
          pointerEvents: hasUserUpvoted ? 'none' : 'auto',
          padding: '4px',
          borderRadius: '4px'
        }}
      >
        <ThumbUp sx={{ fontSize: '1rem' }} />
      </button>
      
      {/* Upvotes Count with Tooltip */}
      <Tooltip
        title={
          upvotes && upvotes.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {upvotes.map((upvote: Annotation) => (
                <Chip
                  key={upvote.id}
                  avatar={<Avatar>{`${upvote.creator.first_name?.charAt(0) || ''}${upvote.creator.last_name?.charAt(0) || ''}`.toUpperCase()}</Avatar>}
                  label={`${upvote.creator.first_name || ''} ${upvote.creator.last_name || ''}`.trim()}
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
      
      {/* Reply Button */}
      <button 
        title="Reply" 
        onClick={onReplyClick} 
        style={{ 
          background: 'none', 
          border: 'none', 
          cursor: 'pointer', 
          color: isReplying ? '#1976d2' : '#6c757d',
          padding: '4px',
          borderRadius: '4px'
        }}
      >
        <ChatBubbleOutline sx={{ fontSize: '1rem' }} />
      </button>
      
      {/* Flag Button */}
      <button 
        title="Flag" 
        onClick={onFlagClick} 
        style={{ 
          background: 'none', 
          border: 'none', 
          cursor: 'pointer', 
          color: isFlagging ? '#f44336' : '#6c757d',
          padding: '4px',
          borderRadius: '4px'
        }}
      >
        <Flag sx={{ fontSize: '1rem' }} />
      </button>
      
      {/* Settings Button */}
      <button 
        title="Settings" 
        onClick={toggleMenu} 
        style={{ 
          background: 'none', 
          border: 'none', 
          cursor: 'pointer', 
          color: '#6c757d',
          padding: '4px',
          borderRadius: '4px'
        }}
      >
        <Settings sx={{ fontSize: '1rem' }} />
      </button>

      {/* Settings Menu */}
      <Menu
        id={`annotation-menu-${annotation.id}`}
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={closeMenu}
        disableScrollLock
      >
        {isAuthor && <MenuItem onClick={handleEditClick}>Edit</MenuItem>}
        {isAuthor && <MenuItem onClick={handleDeleteClick}>Delete</MenuItem>}
        <MenuItem onClick={handleTagsClick}>Tags</MenuItem>
      </Menu>
    </div>
  );
};

export default AnnotationToolbar;