// components/AnnotationEditor.tsx
import React, { useState } from 'react';
import '../../styles/AnnotationCardStyles.css'

interface AnnotationEditorProps {
    initialText: string;
    onSave: (text: string) => void;
    onCancel: () => void;
}

const AnnotationEditor: React.FC<AnnotationEditorProps> = ({ initialText, onSave, onCancel }) => {
    const [editText, setEditText] = useState(initialText);

    const handleSave = () => {
        if (!editText.trim()) return;
        onSave(editText);
    };

    return (
        <div className="edit-section">
            <textarea
                placeholder="Edit your annotation..."
                className='edit-textarea'
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSave();
                    }
                }}
                rows={3}
            />
            <div className="edit-buttons">
                <button
                    className='cancel-edit-button'
                    onClick={onCancel}
                >
                    Cancel
                </button>
                <button
                    className='save-edit-button'
                    onClick={handleSave}
                >
                    Save
                </button>
            </div>
        </div>
    );
};

export default AnnotationEditor;