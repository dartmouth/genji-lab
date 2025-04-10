import React, { useState } from 'react';
import { useAppDispatch, sliceMap } from '@store';
import { useAuth } from '@hooks/useAuthContext';
import { makeTextAnnotationBody, parseURI } from '@documentView/utils';
import '../../styles/AnnotationCardStyles.css'
import { Annotation } from '@documentView/types';
import Snackbar from '@mui/material/Snackbar';

interface ReplyFormProps {
    annotation: Annotation;
    motivation: string;
    onSave: () => void;
}

const ReplyForm: React.FC<ReplyFormProps> = ({ annotation, motivation, onSave }) => {
    const { user } = useAuth();
    const dispatch = useAppDispatch();
    const [replyText, setReplyText] = useState('');
    const [openSnackBar, setOpenSnackbar] = useState(false)

    if (!['replying', 'flagging'].includes(motivation)){
        console.error('bad motivation in reply form')
    }

    const handleSave = () => {
        if (!replyText.trim()) return;
        if (!user) return;
       const segment = [{
            sourceURI: `Annotation/${annotation.id}`,
            start: 1,
            end: 1,
            text: ""
        }]
        const payload = makeTextAnnotationBody(
            annotation.document_collection_id,
            annotation.document_id,
            typeof annotation.document_element_id === "string" ? parseInt(parseURI(annotation.document_element_id)) : annotation.document_element_id,
            user.id,
            motivation,
            replyText,
            segment
        )
        const slice = sliceMap[motivation]
        dispatch(slice.thunks.saveAnnotation(payload));
        setReplyText('');
        if (motivation === 'flagging'){
            setOpenSnackbar(true)
        }
        
        onSave();
    };
    
    const handleClose = () => {
        setOpenSnackbar(false)
    }

    return (
        <div className="reply-section" style={{ marginRight: '10px', marginTop: '10px' }}>
            <textarea
                placeholder={motivation === 'replying' ? "Write your reply..." : "Why should this content be flagged for review?"}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSave();
                    }
                }}
                rows={3}
                className='reply-textarea'
            />
            <div style={{ marginTop: '5px', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                    className='submit-reply-button'
                    onClick={handleSave}
                >
                    Submit
                </button>
            </div>
            <Snackbar
                open={openSnackBar}
                autoHideDuration={6000}
                onClose={handleClose}
                message="Content flag submitted"
                // action={action}
                />
        </div>
    );
};

export default ReplyForm;