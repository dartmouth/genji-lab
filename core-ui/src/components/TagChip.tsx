// components/TagChip.tsx
import React from 'react';

interface TagChipProps {
  id: string | number;
  value: string;
  isOwner: boolean;
  onRemove: (id: string | number) => void;
}

const TagChip: React.FC<TagChipProps> = ({ id, value, isOwner, onRemove }) => {
  return (
    <div 
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
      {value}
      {isOwner && (
        <span 
          onClick={() => onRemove(id)} 
          style={{ 
            marginLeft: '4px', 
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          ×
        </span>
      )}
    </div>
  );
};

export default TagChip;