import React, { useEffect, useRef, useState } from 'react';
import { 
  useAppDispatch, 
  useAppSelector, 
  setContent, 
  resetCreateAnnotation, 
  selectAnnotationCreate, 
  sliceMap 
} from '@store';
import { Link as LinkIcon } from "@mui/icons-material";
import { debounce } from 'lodash';
import { makeTextAnnotationBody, parseURI } from '@documentView/utils';
import { useAuth } from "@hooks/useAuthContext";

interface AnnotationCreationDialogProps {
  onClose: () => void;
}

interface LinkDialogState {
  isOpen: boolean;
  selectedText: string;
  selectionStart: number;
  selectionEnd: number;
  url: string;
}

const AnnotationCreationDialog: React.FC<AnnotationCreationDialogProps> = ({ onClose }) => {
  const dispatch = useAppDispatch();
  const { user, isAuthenticated, login, isLoading } = useAuth();
  const newAnno = useAppSelector(selectAnnotationCreate);
  const dialogRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Link dialog state
  const [linkDialog, setLinkDialog] = useState<LinkDialogState>({
    isOpen: false,
    selectedText: '',
    selectionStart: 0,
    selectionEnd: 0,
    url: ''
  });
  
  // Close dialog when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);
  
  // Focus on textarea when opened (only if authenticated)
  useEffect(() => {
    if (isAuthenticated) {
      const textArea = textareaRef.current;
      if (textArea) {
        textArea.focus();
      }
    }
  }, [isAuthenticated]);

  const onTextChange = (value: string) => {
    dispatch(setContent(value));
  };

  const handleAddLink = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = newAnno.content.substring(start, end);

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
    const newText = newAnno.content.substring(0, selectionStart) + 
                   markdownLink + 
                   newAnno.content.substring(selectionEnd);
    
    dispatch(setContent(newText));
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

  const onSave = () => {
    if (!user || !isAuthenticated) {
      console.log("User not authenticated");
      return;
    }

    const annoType: string = newAnno.motivation;
    const slice = sliceMap[annoType] || {};

    if (!slice) {
      console.error("Bad motivation");
      return;
    }
    
    const annoBody = makeTextAnnotationBody(
      newAnno.target.documentCollectionId,
      newAnno.target.documentId,
      parseURI(newAnno.target.segments[0].sourceURI) as unknown as number,
      user.id,
      newAnno.motivation,
      newAnno.content,
      newAnno.target.segments
    );
    
    dispatch(slice.thunks.saveAnnotation(annoBody));
    dispatch(resetCreateAnnotation());
    onClose();
  };
  
  const onCancel = () => {
    dispatch(resetCreateAnnotation());
    onClose();
  };

  const handleLogin = () => {
    login();
    // Don't close the dialog - let user authenticate and come back
  };
  
  const onTextChangeDebounce = debounce(onTextChange, 10);

  if (!newAnno || !newAnno.motivation) {
    return null;
  }

  return (
    <div className="annotation-dialog-overlay" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 10001
    }}>
      <div 
        ref={dialogRef}
        className="annotation-dialog" 
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          width: '450px',
          maxWidth: '90%',
          padding: '20px',
          maxHeight: '90vh',
          overflow: 'auto'
        }}
      >
        <div className="dialog-header" style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          <h3 style={{ 
            margin: 0, 
            fontSize: '16px', 
            fontWeight: 600, 
            color: '#333'
          }}>
            {newAnno.motivation === 'commenting' ? "Add Comment" : "Add Scholarly Annotation"}
          </h3>
          <button 
            onClick={onCancel}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '18px',
              cursor: 'pointer',
              color: '#666'
            }}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        
        <div className="selected-text" style={{ 
          fontSize: '14px',
          padding: '12px',
          backgroundColor: newAnno.motivation === 'commenting' ? 'rgba(196, 221, 136, 0.2)' : 'rgba(171, 247, 255, 0.2)',
          borderRadius: '6px',
          marginBottom: '16px',
          borderLeft: `4px solid ${newAnno.motivation === 'commenting' ? '#c4dd88' : '#abf7ff'}`
        }}>
          <div style={{ fontWeight: 500, marginBottom: '4px', fontSize: '12px', color: '#666' }}>
            Selected Text:
          </div>
          "{newAnno.target.selectedText}"
        </div>
        
        {!isAuthenticated ? (
          // Show login prompt for anonymous users
          <div style={{
            textAlign: 'center',
            padding: '20px',
            backgroundColor: '#f8f9fa',
            borderRadius: '6px',
            marginBottom: '16px'
          }}>
            <p style={{ marginBottom: '16px', color: '#666' }}>
              You need to be logged in to create annotations.
            </p>
            <button
              onClick={handleLogin}
              disabled={isLoading}
              style={{
                padding: '10px 20px',
                backgroundColor: '#4285f4',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 500,
                opacity: isLoading ? 0.7 : 1
              }}
            >
              {isLoading ? 'Authenticating...' : 'Login with Dartmouth ID'}
            </button>
          </div>
        ) : (
          // Show annotation form for authenticated users
          <>
            {/* Link Toolbar - only show for authenticated users */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '8px',
              padding: '6px 8px',
              backgroundColor: '#f8f9fa',
              borderRadius: '4px',
              border: '1px solid #e9ecef'
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
                Add Link
              </button>
              <span style={{ fontSize: '11px', color: '#666' }}>
                Select text and click "Add Link" to embed external URLs
              </span>
            </div>

            <textarea
              ref={textareaRef}
              value={newAnno.content}
              onChange={(e) => onTextChangeDebounce(e.target.value)}
              placeholder={newAnno.motivation === 'commenting' 
                ? "Enter your comment here..." 
                : "Enter your scholarly annotation here..."}
              style={{ 
                width: '100%', 
                minHeight: '120px',
                padding: '12px',
                marginBottom: '8px',
                borderRadius: '6px',
                border: '1px solid #ddd',
                fontSize: '14px',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
                resize: 'vertical'
              }}
            />

            {/* Preview of rendered links */}
            {newAnno.content.includes('[') && newAnno.content.includes('](') && (
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
                    __html: renderMarkdownPreview(newAnno.content) 
                  }} 
                />
              </div>
            )}
          </>
        )}
        
        {/* Link Dialog */}
        {linkDialog.isOpen && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10
          }}>
            <div style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              minWidth: '400px',
              maxWidth: '500px'
            }}>
              <h4 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>
                Add External Link
              </h4>
              
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
        
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '8px 16px',
              backgroundColor: '#f5f5f5',
              border: '1px solid #ddd',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500
            }}
          >
            Cancel
          </button>
          {isAuthenticated && (
            <button
              onClick={onSave}
              disabled={!newAnno.content.trim()}
              style={{
                padding: '8px 16px',
                backgroundColor: newAnno.content.trim() ? '#4285f4' : '#cccccc',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: newAnno.content.trim() ? 'pointer' : 'not-allowed',
                fontSize: '14px',
                fontWeight: 500
              }}
            >
              Save
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnnotationCreationDialog;