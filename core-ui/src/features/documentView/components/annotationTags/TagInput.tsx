// components/TagInput.tsx
import React, { useState } from 'react';

interface TagInputProps {
  onSubmit: (tags: string[]) => void;
  onClose: () => void;
}

const TagInput: React.FC<TagInputProps> = ({ onSubmit, onClose }) => {
  const [tagInput, setTagInput] = useState("");

  const handleSubmit = () => {
    if (!tagInput.trim()) return;
    
    const newTags = tagInput
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);
    
    onSubmit(newTags);
    setTagInput("");
  };

  return (
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
            handleSubmit();
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
          onClick={onClose}
        >
          Cancel
        </button>
        <button
          style={{
            padding: '5px 10px',
            backgroundColor: '#648FFF',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
          onClick={handleSubmit}
        >
          Add Tags
        </button>
      </div>
    </div>
  );
};

export default TagInput;