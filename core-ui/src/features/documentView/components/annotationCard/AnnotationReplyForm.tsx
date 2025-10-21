import React, { useState, useRef } from 'react';
import { useAppDispatch, sliceMap } from '@store';
import { useAuth } from '@hooks/useAuthContext';
import useLocalStorage from '@hooks/useLocalStorage';
import { makeTextAnnotationBody, parseURI } from '@documentView/utils';
import '../../styles/AnnotationCardStyles.css'
import { Annotation } from '@documentView/types';
import Snackbar from '@mui/material/Snackbar';
import { Link as LinkIcon } from "@mui/icons-material";

interface ReplyFormProps {
    annotation: Annotation;
    motivation: string;
    onSave: () => void;
}

interface LinkDialogState {
    isOpen: boolean;
    selectedText: string;
    selectionStart: number;
    selectionEnd: number;
    url: string;
}

const ReplyForm: React.FC<ReplyFormProps> = ({ annotation, motivation, onSave }) => {
    const { user } = useAuth();
    const dispatch = useAppDispatch();
    const [replyText, setReplyText] = useState('');
    const [openSnackBar, setOpenSnackbar] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    
    // Get classroom context from localStorage (same pattern as AnnotationCreationDialog)
    const [activeClassroomValue] = useLocalStorage('active_classroom');
    const [isOptedOut] = useLocalStorage('classroom_opted_out');
    
    // Link dialog state
    const [linkDialog, setLinkDialog] = useState<LinkDialogState>({
        isOpen: false,
        selectedText: '',
        selectionStart: 0,
        selectionEnd: 0,
        url: ''
    });

    if (!['replying', 'flagging'].includes(motivation)){
        console.error('bad motivation in reply form')
    }

    const handleAddLink = () => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = replyText.substring(start, end);

        if (selectedText.trim() === '') {
            alert('Please select text first to add a link');
            return;
        }

        setLinkDialog({
            isOpen: true,
            selectedText,
            selectionStart: start,
            selectionEnd: end,
            url: ''
        });
    };

    const handleInsertLink = () => {
        if (!linkDialog.url.trim()) {
            alert('Please enter a valid URL');
            return;
        }

        const { selectedText, selectionStart, selectionEnd, url } = linkDialog;
        
        // Create markdown link format
        const markdownLink = `[${selectedText}](${url})`;
        
        // Replace selected text with markdown link
        const newText = replyText.substring(0, selectionStart) + 
                       markdownLink + 
                       replyText.substring(selectionEnd);
        
        setReplyText(newText);
        setLinkDialog({
            isOpen: false,
            selectedText: '',
            selectionStart: 0,
            selectionEnd: 0,
            url: ''
        });

        // Focus back to textarea
        setTimeout(() => {
            textareaRef.current?.focus();
        }, 100);
    };

    const handleCancelLink = () => {
        setLinkDialog({
            isOpen: false,
            selectedText: '',
            selectionStart: 0,
            selectionEnd: 0,
            url: ''
        });
        textareaRef.current?.focus();
    };

    const renderMarkdownPreview = (text: string) => {
        return text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    };

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
        
        // Prepare save parameters with classroom context (same pattern as AnnotationCreationDialog)
        const saveParams: { annotation: typeof payload; classroomId?: string } = {
            annotation: payload
        };
        
        // Only include classroomId if user is in a classroom and hasn't opted out
        if (activeClassroomValue && isOptedOut !== 'true') {
            saveParams.classroomId = activeClassroomValue as string;
        }
        
        dispatch(slice.thunks.saveAnnotation(saveParams));
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
            {/* Link Toolbar */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '8px',
                padding: '4px 8px',
                backgroundColor: '#f5f5f5',
                borderRadius: '4px',
                border: '1px solid #e0e0e0'
            }}>
                <button
                    type="button"
                    onClick={handleAddLink}
                    title="Add external link (select text first)"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#1976d2',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e3f2fd'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                    <LinkIcon sx={{ fontSize: '16px' }} />
                    Link
                </button>
                <span style={{ fontSize: '11px', color: '#666' }}>
                    Select text and click Link to add external links
                </span>
            </div>

            <textarea
                ref={textareaRef}
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
                style={{ marginBottom: '8px' }}
            />

            {/* Preview of rendered links */}
            {replyText.includes('[') && replyText.includes('](') && (
                <div style={{
                    padding: '8px',
                    backgroundColor: '#f9f9f9',
                    border: '1px solid #e0e0e0',
                    borderRadius: '4px',
                    marginBottom: '8px',
                    fontSize: '12px'
                }}>
                    <strong>Preview:</strong>
                    <div 
                        style={{ marginTop: '4px' }}
                        dangerouslySetInnerHTML={{ 
                            __html: renderMarkdownPreview(replyText) 
                        }} 
                    />
                </div>
            )}

            {/* Link Dialog */}
            {linkDialog.isOpen && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10002
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        padding: '20px',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                        minWidth: '400px',
                        maxWidth: '500px'
                    }}>
                        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>
                            Add External Link
                        </h3>
                        
                        <div style={{ marginBottom: '12px' }}>
                            <label style={{ 
                                display: 'block', 
                                marginBottom: '4px', 
                                fontSize: '14px', 
                                fontWeight: '500' 
                            }}>
                                Selected Text:
                            </label>
                            <input
                                type="text"
                                value={linkDialog.selectedText}
                                readOnly
                                style={{
                                    width: '100%',
                                    padding: '8px',
                                    border: '1px solid #ddd',
                                    borderRadius: '4px',
                                    backgroundColor: '#f5f5f5',
                                    fontSize: '14px'
                                }}
                            />
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ 
                                display: 'block', 
                                marginBottom: '4px', 
                                fontSize: '14px', 
                                fontWeight: '500' 
                            }}>
                                URL:
                            </label>
                            <input
                                type="url"
                                value={linkDialog.url}
                                onChange={(e) => setLinkDialog(prev => ({ ...prev, url: e.target.value }))}
                                placeholder="https://example.com"
                                autoFocus
                                style={{
                                    width: '100%',
                                    padding: '8px',
                                    border: '1px solid #ddd',
                                    borderRadius: '4px',
                                    fontSize: '14px'
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleInsertLink();
                                    } else if (e.key === 'Escape') {
                                        handleCancelLink();
                                    }
                                }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button
                                onClick={handleCancelLink}
                                style={{
                                    padding: '8px 16px',
                                    border: '1px solid #ddd',
                                    backgroundColor: 'white',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '14px'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleInsertLink}
                                style={{
                                    padding: '8px 16px',
                                    border: 'none',
                                    backgroundColor: '#1976d2',
                                    color: 'white',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '14px'
                                }}
                            >
                                Add Link
                            </button>
                        </div>
                    </div>
                </div>
            )}

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