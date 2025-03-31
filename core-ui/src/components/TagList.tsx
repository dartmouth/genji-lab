// components/TagList.tsx
import React from 'react';
import TagChip from './TagChip';
import { Annotation } from '../types/annotation';

interface TagListProps {
  tags: Annotation[];
  userId?: number;
  onRemoveTag: (tagId: number | string) => void;
}

const TagList: React.FC<TagListProps> = ({ tags, userId, onRemoveTag }) => {
  if (!tags || tags.filter(tag => tag && tag.body).length === 0) {
    return null;
  }

  return (
    <div className="tags-container" style={{ 
      display: 'flex', 
      flexWrap: 'wrap', 
      gap: '5px',
      marginTop: '8px' 
    }}>
      {tags.map(tag => (
        <TagChip
          key={tag.id}
          id={tag.id}
          value={tag.body.value}
          isOwner={userId !== undefined && tag.creator.id === userId}
          onRemove={onRemoveTag}
        />
      ))}
    </div>
  );
};

export default TagList;