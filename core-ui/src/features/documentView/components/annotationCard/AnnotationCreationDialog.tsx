import React, { useEffect, useRef, useState } from "react";
import {
  useAppDispatch,
  useAppSelector,
  setContent,
  resetCreateAnnotation,
  selectAnnotationCreate,
  sliceMap,
} from "@store";
import { Link as LinkIcon } from "@mui/icons-material";
// import { debounce } from "lodash";
import type { Annotation } from "@documentView/types";
import { makeTextAnnotationBody, parseURI } from "@documentView/utils";
import { useAuth } from "@hooks/useAuthContext";
import useLocalStorage from "@/hooks/useLocalStorage";
import { linkingAnnotations } from "@store";
import { selectAllLinkingAnnotations } from "@store";
import ExternalReferenceDialog from "./ExternalReferenceDialog";

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

const AnnotationCreationDialog: React.FC<AnnotationCreationDialogProps> = ({
  onClose,
}) => {
  const dispatch = useAppDispatch();
  const { user, isAuthenticated, login, isLoading } = useAuth();
  const newAnno = useAppSelector(selectAnnotationCreate);
  const links = useAppSelector(selectAllLinkingAnnotations);
  const [selectedLink, setSelectedLink] = useState<number | null>(null);
  const annotationCreate = useAppSelector(selectAnnotationCreate);
  const dialogRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Character limit constant
  const MAX_CHARACTERS = 5000;

  // Get classroom context from localStorage
  const [activeClassroomValue] = useLocalStorage("active_classroom");
  const [isOptedOut] = useLocalStorage("classroom_opted_out");

  // Link dialog state
  const [linkDialog, setLinkDialog] = useState<LinkDialogState>({
    isOpen: false,
    selectedText: "",
    selectionStart: 0,
    selectionEnd: 0,
    url: "",
  });

  // Calculate character count
  const characterCount = newAnno?.content?.length || 0;
  const isOverLimit = characterCount > MAX_CHARACTERS;

  // Auto-select first link when links load
  useEffect(() => {
    if (links && links.length > 0 && selectedLink === null) {
      setSelectedLink(Number(links[0].id));
    }
  }, [links, selectedLink]);

  // Close dialog when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dialogRef.current &&
        !dialogRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
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

  // Fetch all linking annotations when dialog opens with linking motivation
  useEffect(() => {
    if (annotationCreate.motivation === "linking" && isAuthenticated) {
      const fetchAllLinks = async () => {
        try {
          // Linking annotations are GLOBAL - don't pass classroom_id
          const response = await fetch(
            `/api/v1/annotations/?motivation=linking`,
            {
              headers: {
                Authorization: `Bearer ${
                  localStorage.getItem("access_token") ||
                  sessionStorage.getItem("access_token")
                }`,
              },
            }
          );

          if (response.ok) {
            const allLinkingAnnotations =
              (await response.json()) as Annotation[];
            allLinkingAnnotations.forEach((annotation) => {
              dispatch(linkingAnnotations.actions.addAnnotation(annotation));
            });
          }
        } catch (error) {
          console.error("Failed to fetch all linking annotations:", error);
        }
      };

      fetchAllLinks();
    }
  }, [
    annotationCreate.motivation,
    isAuthenticated,
    dispatch, // Remove activeClassroomValue and isOptedOut from dependencies
  ]);

  const onTextChange = (value: string) => {
    // Don't allow more than MAX_CHARACTERS
    if (value.length <= MAX_CHARACTERS) {
      dispatch(setContent(value));
    }
  };

  if (annotationCreate.motivation === "external_reference") {
    return <ExternalReferenceDialog onClose={onClose} />;
  }

  const handleAddLink = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = newAnno.content.substring(start, end);

    if (selectedText.trim() === "") {
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
      newAnno.content.substring(0, selectionStart) +
      markdownLink +
      newAnno.content.substring(selectionEnd);

    // Check if new text exceeds limit
    if (newText.length <= MAX_CHARACTERS) {
      dispatch(setContent(newText));
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
    return text.replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
    );
  };

  const makeLinkAnnotationBody = () => {
    return newAnno.target.segments.map((targ) => {
      return {
        type: "Text",
        source: targ.sourceURI,
        selector: {
          type: "TextQuoteSelector",
          value: targ.text,
          refined_by: {
            type: "TextPositionSelector",
            start: targ.start,
            end: targ.end,
          },
        },
      };
    });
  };

  const saveLinkingAnnotation = async () => {
    if (!selectedLink) {
      return;
    }
    const linkingBody = makeLinkAnnotationBody();

    try {
      // Dispatch the addTarget thunk and wait for it to complete
      await dispatch(
        linkingAnnotations.thunks.addTarget({
          annotationId: selectedLink,
          target: linkingBody,
        })
      ).unwrap();

      // After successfully adding targets, refetch annotations for all affected elements
      // Extract unique element IDs from the segments
      const affectedElementIds = new Set<number>();
      newAnno.target.segments.forEach((seg) => {
        const elementId = parseURI(seg.sourceURI);
        if (elementId) {
          affectedElementIds.add(elementId as unknown as number);
        }
      });

      // Refetch annotations for each affected element
      const classroomParams =
        activeClassroomValue && isOptedOut !== "true"
          ? { classroomID: activeClassroomValue as unknown as number }
          : {};

      for (const elementId of affectedElementIds) {
        await dispatch(
          linkingAnnotations.thunks.fetchAnnotations({
            documentElementId: String(elementId),
            classroomId: classroomParams.classroomID
              ? String(classroomParams.classroomID)
              : undefined,
          })
        );
      }
    } catch (error) {
      console.error("Failed to add content to link:", error);
    }
  };

  const saveStandardAnnotation = () => {
    const annoType = newAnno.motivation;
    const slice = sliceMap[annoType];

    if (!slice) {
      console.error("Bad motivation");
      return;
    }

    if (!user || !isAuthenticated) {
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

    // Only comments should have classroom context
    const isComment = newAnno.motivation === "commenting";

    // Parse classroom ID and convert to string for the API
    let classroomId: string | undefined = undefined;
    if (isComment && activeClassroomValue && isOptedOut !== "true") {
      const parsed = parseInt(activeClassroomValue as string, 10);
      if (!isNaN(parsed) && parsed > 0) {
        classroomId = String(parsed);
      }
    }

    const saveParams = {
      annotation: annoBody,
      ...(classroomId ? { classroomId } : {}),
    };

    dispatch(slice.thunks.saveAnnotation(saveParams));
  };

  const onSave = async () => {
    if (!user || !isAuthenticated) {
      return;
    }

    if (newAnno.motivation === "linking") {
      await saveLinkingAnnotation();
    } else {
      saveStandardAnnotation();
    }

    dispatch(resetCreateAnnotation());
    onClose();
  };

  const onCancel = () => {
    dispatch(resetCreateAnnotation());
    onClose();
  };

  const handleLogin = () => {
    login();
  };

  if (!newAnno || !newAnno.motivation) {
    return null;
  }

  return (
    <div
      className="annotation-dialog-overlay"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 10001,
      }}
    >
      <div
        ref={dialogRef}
        className="annotation-dialog"
        style={{
          backgroundColor: "white",
          borderRadius: "8px",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
          width: "450px",
          maxWidth: "90%",
          padding: "20px",
          maxHeight: "90vh",
          overflow: "auto",
        }}
      >
        <div
          className="dialog-header"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: "16px",
              fontWeight: 600,
              color: "#333",
            }}
          >
            {newAnno.motivation === "commenting"
              ? "Add Comment"
              : newAnno.motivation === "scholarly"
              ? "Add Scholarly Annotation"
              : "Add Content to Link"}
          </h3>
          <button
            onClick={onCancel}
            style={{
              background: "none",
              border: "none",
              fontSize: "18px",
              cursor: "pointer",
              color: "#666",
            }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div
          className="selected-text"
          style={{
            fontSize: "14px",
            padding: "12px",
            backgroundColor:
              newAnno.motivation === "commenting"
                ? "rgba(196, 221, 136, 0.2)"
                : "rgba(171, 247, 255, 0.2)",
            borderRadius: "6px",
            marginBottom: "16px",
            borderLeft: `4px solid ${
              newAnno.motivation === "commenting" ? "#c4dd88" : "#abf7ff"
            }`,
          }}
        >
          <div
            style={{
              fontWeight: 500,
              marginBottom: "4px",
              fontSize: "12px",
              color: "#666",
            }}
          >
            Selected Text:
          </div>
          "{newAnno.target.selectedText}"
        </div>

        {!isAuthenticated ? (
          // Show login prompt for anonymous users
          <div
            style={{
              textAlign: "center",
              padding: "20px",
              backgroundColor: "#f8f9fa",
              borderRadius: "6px",
              marginBottom: "16px",
            }}
          >
            <p style={{ marginBottom: "16px", color: "#666" }}>
              You need to be logged in to create annotations.
            </p>
            <button
              onClick={handleLogin}
              disabled={isLoading}
              style={{
                padding: "10px 20px",
                backgroundColor: "#4285f4",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: isLoading ? "not-allowed" : "pointer",
                fontSize: "14px",
                fontWeight: 500,
                opacity: isLoading ? 0.7 : 1,
              }}
            >
              {isLoading ? "Authenticating..." : "Login with Dartmouth ID"}
            </button>
          </div>
        ) : (
          // Show annotation form for authenticated users
          <>
            {newAnno.motivation === "linking" ? (
              <div></div>
            ) : (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "8px",
                  padding: "6px 8px",
                  backgroundColor: "#f8f9fa",
                  borderRadius: "4px",
                  border: "1px solid #e9ecef",
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
                  Add Link
                </button>
                <span style={{ fontSize: "11px", color: "#666" }}>
                  Select text and click "Add Link" to embed external URLs
                </span>
              </div>
            )}
            {newAnno.motivation === "linking" ? (
              <div></div>
            ) : (
              <div style={{ position: "relative" }}>
                <textarea
                  ref={textareaRef}
                  value={newAnno.content}
                  onChange={(e) => onTextChange(e.target.value)}
                  maxLength={MAX_CHARACTERS}
                  placeholder={
                    newAnno.motivation === "commenting"
                      ? "Enter your comment here..."
                      : "Enter your scholarly annotation here..."
                  }
                  style={{
                    width: "100%",
                    minHeight: "120px",
                    padding: "12px",
                    paddingBottom: "30px", // Make room for counter
                    marginBottom: "8px",
                    borderRadius: "6px",
                    border: `1px solid ${isOverLimit ? "#dc3545" : "#ddd"}`,
                    fontSize: "14px",
                    fontFamily: "inherit",
                    boxSizing: "border-box",
                    resize: "vertical",
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
            )}

            {/* Preview of rendered links */}
            {newAnno.content.includes("[") &&
              newAnno.content.includes("](") && (
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
                      __html: renderMarkdownPreview(newAnno.content),
                    }}
                  />
                </div>
              )}
          </>
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
              backgroundColor: "rgba(0, 0, 0, 0.6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 10,
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
              <h4 style={{ margin: "0 0 16px 0", fontSize: "16px" }}>
                Add External Link
              </h4>

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

        {newAnno.motivation === "linking" && (
          <div style={{ marginBottom: "12px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "4px",
                fontSize: "14px",
                fontWeight: 500,
              }}
            >
              Select Link:
            </label>
            <select
              value={selectedLink || ""}
              onChange={(e) => {
                setSelectedLink(Number(e.target.value));
              }}
              style={{
                padding: "8px 12px",
                fontSize: "14px",
                borderRadius: "6px",
                border: "1px solid #ddd",
                width: "100%",
                cursor: "pointer",
                backgroundColor: "white",
              }}
            >
              {links.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.body.value}
                </option>
              ))}
            </select>
          </div>
        )}

        <div
          style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}
        >
          <button
            onClick={onCancel}
            style={{
              padding: "8px 16px",
              backgroundColor: "#f5f5f5",
              border: "1px solid #ddd",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: 500,
            }}
          >
            Cancel
          </button>
          {isAuthenticated &&
            (() => {
              const isEnabled =
                (newAnno.content.trim() && !isOverLimit) ||
                newAnno.motivation === "linking";

              return (
                <button
                  onClick={onSave}
                  disabled={!isEnabled}
                  style={{
                    padding: "8px 16px",
                    backgroundColor: isEnabled ? "#4285f4" : "#cccccc",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: isEnabled ? "pointer" : "not-allowed",
                    fontSize: "14px",
                    fontWeight: 500,
                  }}
                >
                  Save
                </button>
              );
            })()}
        </div>
      </div>
    </div>
  );
};

export default AnnotationCreationDialog;
