// components/AnnotationEditor.tsx
import React, { useState, useRef } from "react";
import { Link as LinkIcon } from "@mui/icons-material";
import "../../styles/AnnotationCardStyles.css";

interface AnnotationEditorProps {
  initialText: string;
  onSave: (text: string) => void;
  onCancel: () => void;
}

interface LinkDialogState {
  isOpen: boolean;
  selectedText: string;
  selectionStart: number;
  selectionEnd: number;
  url: string;
}

const AnnotationEditor: React.FC<AnnotationEditorProps> = ({
  initialText,
  onSave,
  onCancel,
}) => {
  const [editText, setEditText] = useState(initialText);
  const [linkDialog, setLinkDialog] = useState<LinkDialogState>({
    isOpen: false,
    selectedText: "",
    selectionStart: 0,
    selectionEnd: 0,
    url: "",
  });
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Character limit constant
  const MAX_CHARACTERS = 5000;

  // Calculate character count
  const characterCount = editText.length;
  const isOverLimit = characterCount > MAX_CHARACTERS;

  const handleSave = () => {
    if (!editText.trim() || isOverLimit) return;
    onSave(editText);
  };

  const handleTextChange = (value: string) => {
    // Enforce character limit
    if (value.length <= MAX_CHARACTERS) {
      setEditText(value);
    }
  };

  const handleAddLink = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = editText.substring(start, end);

    if (selectedText.trim() === "") {
      // No text selected, show alert or handle as needed
      alert("Please select text first to add a link");
      return;
    }

    setLinkDialog({
      isOpen: true,
      selectedText,
      selectionStart: start,
      selectionEnd: end,
      url: "",
    });
  };

  const handleInsertLink = () => {
    if (!linkDialog.url.trim()) {
      alert("Please enter a valid URL");
      return;
    }

    const { selectedText, selectionStart, selectionEnd, url } = linkDialog;

    // Create markdown link format
    const markdownLink = `[${selectedText}](${url})`;

    // Replace selected text with markdown link
    const newText =
      editText.substring(0, selectionStart) +
      markdownLink +
      editText.substring(selectionEnd);

    // Check if new text exceeds limit
    if (newText.length <= MAX_CHARACTERS) {
      setEditText(newText);
      setLinkDialog({
        isOpen: false,
        selectedText: "",
        selectionStart: 0,
        selectionEnd: 0,
        url: "",
      });

      // Focus back to textarea
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    } else {
      alert(
        `Adding this link would exceed the ${MAX_CHARACTERS} character limit`
      );
    }
  };

  const handleCancelLink = () => {
    setLinkDialog({
      isOpen: false,
      selectedText: "",
      selectionStart: 0,
      selectionEnd: 0,
      url: "",
    });
    textareaRef.current?.focus();
  };

  const renderMarkdownPreview = (text: string) => {
    // Simple markdown link renderer for preview
    return text.replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
    );
  };

  return (
    <div className="edit-section">
      {/* Toolbar */}
      <div
        className="annotation-editor-toolbar"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "8px",
          padding: "4px 8px",
          backgroundColor: "#f5f5f5",
          borderRadius: "4px",
          border: "1px solid #e0e0e0",
        }}
      >
        <button
          type="button"
          onClick={handleAddLink}
          title="Add external link (select text first)"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#1976d2",
            padding: "4px 8px",
            borderRadius: "4px",
            fontSize: "12px",
            transition: "background-color 0.2s",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor = "#e3f2fd")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.backgroundColor = "transparent")
          }
        >
          <LinkIcon sx={{ fontSize: "16px" }} />
          Link
        </button>
        <span style={{ fontSize: "11px", color: "#666" }}>
          Select text and click Link to add external links
        </span>
      </div>

      {/* Main textarea with character counter */}
      <div style={{ position: "relative" }}>
        <textarea
          ref={textareaRef}
          placeholder="Edit your annotation... Use [text](url) format for links"
          className="edit-textarea"
          value={editText}
          onChange={(e) => handleTextChange(e.target.value)}
          maxLength={MAX_CHARACTERS}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSave();
            }
          }}
          rows={3}
          style={{
            marginBottom: "8px",
            paddingBottom: "30px", // Make room for counter
            border: `1px solid ${isOverLimit ? "#dc3545" : "#ddd"}`,
          }}
        />
        {/* Character Counter */}
        <div
          style={{
            position: "absolute",
            bottom: "16px",
            right: "12px",
            fontSize: "11px",
            color: isOverLimit
              ? "#dc3545"
              : characterCount > MAX_CHARACTERS * 0.9
              ? "#ff9800"
              : "#666",
            fontWeight: isOverLimit ? 600 : 400,
            pointerEvents: "none",
          }}
        >
          {characterCount}/{MAX_CHARACTERS}
        </div>
      </div>

      {/* Preview of rendered links */}
      {editText.includes("[") && editText.includes("](") && (
        <div
          style={{
            padding: "8px",
            backgroundColor: "#f9f9f9",
            border: "1px solid #e0e0e0",
            borderRadius: "4px",
            marginBottom: "8px",
            fontSize: "12px",
          }}
        >
          <strong>Preview:</strong>
          <div
            style={{ marginTop: "4px" }}
            dangerouslySetInnerHTML={{
              __html: renderMarkdownPreview(editText),
            }}
          />
        </div>
      )}

      {/* Link Dialog */}
      {linkDialog.isOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              padding: "20px",
              borderRadius: "8px",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
              minWidth: "400px",
              maxWidth: "500px",
            }}
          >
            <h3 style={{ margin: "0 0 16px 0", fontSize: "16px" }}>
              Add External Link
            </h3>

            <div style={{ marginBottom: "12px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "4px",
                  fontSize: "14px",
                  fontWeight: "500",
                }}
              >
                Selected Text:
              </label>
              <input
                type="text"
                value={linkDialog.selectedText}
                readOnly
                style={{
                  width: "100%",
                  padding: "8px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  backgroundColor: "#f5f5f5",
                  fontSize: "14px",
                }}
              />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "4px",
                  fontSize: "14px",
                  fontWeight: "500",
                }}
              >
                URL:
              </label>
              <input
                type="url"
                value={linkDialog.url}
                onChange={(e) =>
                  setLinkDialog((prev) => ({ ...prev, url: e.target.value }))
                }
                placeholder="https://example.com"
                autoFocus
                style={{
                  width: "100%",
                  padding: "8px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  fontSize: "14px",
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleInsertLink();
                  } else if (e.key === "Escape") {
                    handleCancelLink();
                  }
                }}
              />
            </div>

            <div
              style={{
                display: "flex",
                gap: "8px",
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={handleCancelLink}
                style={{
                  padding: "8px 16px",
                  border: "1px solid #ddd",
                  backgroundColor: "white",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "14px",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleInsertLink}
                style={{
                  padding: "8px 16px",
                  border: "none",
                  backgroundColor: "#1976d2",
                  color: "white",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "14px",
                }}
              >
                Add Link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save/Cancel buttons */}
      <div className="edit-buttons">
        <button className="cancel-edit-button" onClick={onCancel}>
          Cancel
        </button>
        <button
          className="save-edit-button"
          onClick={handleSave}
          disabled={!editText.trim() || isOverLimit}
          style={{
            opacity: !editText.trim() || isOverLimit ? 0.5 : 1,
            cursor: !editText.trim() || isOverLimit ? "not-allowed" : "pointer",
          }}
        >
          Save
        </button>
      </div>
    </div>
  );
};

export default AnnotationEditor;
