// components/ReplyForm.tsx
import React, { useState } from 'react';
import { Annotation, AnnotationCreate } from '../types/annotation';
import { useAppDispatch } from '../store/hooks/useAppDispatch';
import { saveReplyingAnnotation } from '../store/thunk/annotationThunks';
import { useAuth } from '../hooks/useAuthContext';
import { parseURI } from '../functions/makeAnnotationBody';

interface ReplyFormProps {
    annotation: Annotation;
    onSave: () => void;
}

const ReplyForm: React.FC<ReplyFormProps> = ({ annotation, onSave }) => {
    const { user } = useAuth();
    const dispatch = useAppDispatch();
    const [replyText, setReplyText] = useState('');

    const handleSave = () => {
        if (!replyText.trim()) return;
        if (!user) return;
    
        const replyPayload: AnnotationCreate = {
            creator_id: user.id,
            context: "http://www.w3.org/ns/anno.jsonld",
            document_id: annotation.document_id,
            type: "Annotation",
            generator: "web-client",
            document_collection_id: annotation.document_collection_id,
            document_element_id: typeof annotation.document_element_id === "string"
                ? parseInt(parseURI(annotation.document_element_id))
                : annotation.document_element_id,
            motivation: "replying",
            annotation_type: "reply",
            body: {
                type: "TextualBody",
                value: replyText,
                format: "text/html",
                language: "en"
            },
            target: [
                {
                    type: "Text",
                    source: `Annotation/${annotation.id}`
                }
            ]
        };
    
        dispatch(saveReplyingAnnotation(replyPayload));
        setReplyText('');
        onSave();
    };

    return (
        <div className="reply-section" style={{ marginRight: '10px', marginTop: '10px' }}>
            <textarea
                placeholder="Write your reply..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
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
                    onClick={handleSave}
                >
                    Submit
                </button>
            </div>
        </div>
    );
};

export default ReplyForm;