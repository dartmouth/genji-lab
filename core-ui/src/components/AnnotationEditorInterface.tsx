// components/AnnotationEditor.tsx
import React, { useState } from 'react';

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
        <div className="edit-section" style={{ marginRight: '10px', marginTop: '10px' }}>
            <textarea
                placeholder="Edit your annotation..."
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSave();
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
                    onClick={onCancel}
                >
                    Cancel
                </button>
                <button
                    style={{
                        padding: '5px 10px',
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                    }}
                    onClick={handleSave}
                >
                    Save
                </button>
            </div>
        </div>
    );
};

export default AnnotationEditor;