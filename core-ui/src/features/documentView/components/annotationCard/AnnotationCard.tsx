import React, { useState, useRef, useEffect } from "react";
import {
  RootState,
  replyingAnnotations,
  upvoteAnnotations,
  sliceMap,
  useAppDispatch,
  useAppSelector,
} from "@store";
import { Annotation } from "@documentView/types";
import { useAnnotationTags } from "@documentView/hooks";
import { useAuth } from "@hooks/useAuthContext";
import "@documentView/styles/AnnotationCardStyles.css";
import { parseURI, makeTextAnnotationBody } from "@documentView/utils";
import {
  ThumbUp,
  ChatBubbleOutline,
  Flag,
  Settings,
  Link as LinkIcon,
} from "@mui/icons-material";

import { createPortal } from "react-dom";
import AnnotationCardHeader from "./AnnotationCardHeader";
import AnnotationCardToolbar from "./AnnotationCardToolbar";
import AnnotationCardContent from "./AnnotationCardContent";
import AnnotationCardReplies from "./AnnotationCardReplies";
import { AnnotationEditor, ReplyForm } from "./";

interface AnnotationCardProps {
  id: string;
  annotation: Annotation;
  isHighlighted?: boolean;
  depth: number;
  documentColor?: string;
  documentTitle?: string;
  showDocumentInfo?: boolean;
  position?: "bottom" | "right" | "left";
}

const AnnotationCard: React.FC<AnnotationCardProps> = ({
  id,
  annotation,
  isHighlighted = false,
  depth = 0,
  documentColor = "#6c757d",
  documentTitle = `Document ${annotation.document_id}`,
  showDocumentInfo = false,
  position = "bottom",
}) => {
  const { user, isAuthenticated } = useAuth();
  const dispatch = useAppDispatch();

  // Component state
  const [isReplying, setIsReplying] = useState(false);
  const [isFlagging, setIsFlagging] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [actionMenuAnchor, setActionMenuAnchor] = useState<null | HTMLElement>(
    null
  );
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });

  // Ref for the action button to calculate position
  const actionButtonRef = useRef<HTMLButtonElement>(null);

  // Custom hooks
  const {
    tags,
    isTagging,
    setIsTagging,
    handleTagsClick,
    handleRemoveTag,
    handleTagSubmit,
  } = useAnnotationTags(annotation, user?.id);

  // Redux selectors
  const replies = useAppSelector((state: RootState) =>
    replyingAnnotations.selectors.selectAnnotationsByParent(
      state,
      `Annotation/${id}`
    )
  );

  const upvotes = useAppSelector((state: RootState) =>
    upvoteAnnotations.selectors.selectAnnotationsByParent(
      state,
      `Annotation/${id}`
    )
  );

  const hasUserUpvoted = !!(
    user?.id && upvotes?.some((u) => u.creator.id === user.id)
  );

  // Calculate dropdown position when menu opens
  useEffect(() => {
    if (actionMenuAnchor && actionButtonRef.current) {
      const buttonRect = actionButtonRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let top = buttonRect.bottom + 4;
      let left = buttonRect.left;

      if (left + 160 > viewportWidth) {
        left = buttonRect.right - 160;
      }

      if (top + 200 > viewportHeight) {
        top = buttonRect.top - 200;
      }

      if (left < 8) {
        left = 8;
      }

      setDropdownPosition({ top, left });
    }
  }, [actionMenuAnchor]);

  // Event handlers
  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleEditCancel = () => {
    setIsEditing(false);
  };

  const handleEditSave = (editText: string) => {
    if (!editText.trim()) return;

    const motivation = annotation.motivation;
    const slice = sliceMap[motivation];

    if (!slice) {
      console.error("Bad motivation in update: ", motivation);
      return;
    }

    dispatch(
      slice.thunks.patchAnnotation({
        annotationId: parseInt(annotation.id),
        payload: { body: editText },
      })
    );

    setIsEditing(false);
  };

  const handleCommentDelete = () => {
    const motivation = annotation.motivation;
    const slice = sliceMap[motivation];

    if (!slice) {
      console.error("Bad motivation in delete: ", motivation);
      console.error("Available slices:", Object.keys(sliceMap));
      return;
    }

    if (!slice.thunks || !slice.thunks.deleteAnnotation) {
      console.error("Delete thunk not available for motivation:", motivation);
      return;
    }

    try {
      dispatch(
        slice.thunks.deleteAnnotation({
          annotationId: parseInt(annotation.id),
        })
      );
    } catch (error) {
      console.error("Error dispatching delete:", error);
    }
  };

  const handleReplyClick = () => {
    setIsReplying(!isReplying);
  };

  const handleFlagClick = () => {
    setIsFlagging(true);
  };

  const handleTagsMenuClick = () => {
    handleTagsClick();
  };

  // New link handler - only for annotation creators
  const handleLinkClick = () => {
    // Only allow link functionality for annotation creators
    if (!user || user.id !== annotation.creator.id) {
      return;
    }

    if (!isEditing) {
      // If not currently editing, start editing mode
      setIsEditing(true);
    }
  };

  const handleReplySave = () => {
    setIsReplying(false);
  };

  const handleFlagSave = () => {
    setIsFlagging(false);
  };

  const handleCloseTagging = () => {
    setIsTagging(false);
  };

  // Action menu handlers for side panels
  const handleActionMenuOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setActionMenuAnchor(event.currentTarget);
  };

  const closeActionMenu = () => {
    setActionMenuAnchor(null);
  };

  const handleUpvote = () => {
    if (!user) return;
    if (!user.id) return;

    const deId =
      typeof annotation.document_element_id === "string"
        ? parseInt(parseURI(annotation.document_element_id))
        : annotation.document_element_id;

    const segment = [
      {
        sourceURI: `Annotation/${annotation.id}`,
        start: 1,
        end: 1,
        text: "",
      },
    ];

    const upvote = makeTextAnnotationBody(
      annotation.document_collection_id,
      annotation.document_id,
      deId,
      user.id,
      "upvoting",
      "Upvote",
      segment
    );

    dispatch(upvoteAnnotations.thunks.saveAnnotation({annotation: upvote}));
  };

  // Dropdown menu component for portal
  const DropdownMenu = () => (
    <div
      style={{
        position: "fixed",
        top: `${dropdownPosition.top}px`,
        left: `${dropdownPosition.left}px`,
        backgroundColor: "white",
        border: "1px solid #ddd",
        borderRadius: "8px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        zIndex: 9999,
        width: "160px",
        padding: "4px 0",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Upvote */}
      <div
        onClick={(e) => {
          e.stopPropagation();
          if (!hasUserUpvoted) {
            handleUpvote();
          }
          closeActionMenu();
        }}
        style={{
          padding: "10px 12px",
          cursor: hasUserUpvoted ? "not-allowed" : "pointer",
          opacity: hasUserUpvoted ? 0.5 : 1,
          display: "flex",
          alignItems: "center",
          gap: "8px",
          fontSize: "14px",
          borderBottom: "1px solid #f0f0f0",
        }}
        onMouseEnter={(e) => {
          if (!hasUserUpvoted)
            e.currentTarget.style.backgroundColor = "#f5f5f5";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "transparent";
        }}
      >
        <ThumbUp
          sx={{ fontSize: "1rem", color: hasUserUpvoted ? "#aaa" : "#34A853" }}
        />
        <span>Upvote ({upvotes?.length || 0})</span>
      </div>

      {/* Reply */}
      <div
        onClick={(e) => {
          e.stopPropagation();
          setIsReplying(!isReplying);
          closeActionMenu();
        }}
        style={{
          padding: "10px 12px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          fontSize: "14px",
          borderBottom: "1px solid #f0f0f0",
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.backgroundColor = "#f5f5f5")
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.backgroundColor = "transparent")
        }
      >
        <ChatBubbleOutline sx={{ fontSize: "1rem" }} />
        <span>Reply</span>
      </div>

      {/* Flag */}
      <div
        onClick={(e) => {
          e.stopPropagation();
          setIsFlagging(true);
          closeActionMenu();
        }}
        style={{
          padding: "10px 12px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          fontSize: "14px",
          borderBottom: "1px solid #f0f0f0",
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.backgroundColor = "#f5f5f5")
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.backgroundColor = "transparent")
        }
      >
        <Flag sx={{ fontSize: "1rem" }} />
        <span>Flag</span>
      </div>

      {/* Add Link - Show when user owns annotation */}
      {user && user.id === annotation.creator.id && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            handleLinkClick();
            closeActionMenu();
          }}
          style={{
            padding: "10px 12px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "14px",
            borderBottom: "1px solid #f0f0f0",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor = "#f5f5f5")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.backgroundColor = "transparent")
          }
        >
          <LinkIcon sx={{ fontSize: "1rem" }} />
          <span>Add Link</span>
        </div>
      )}

      {/* Edit/Delete/Tags (if user owns annotation) */}
      {user && user.id === annotation.creator.id && (
        <>
          <div
            onClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
              closeActionMenu();
            }}
            style={{
              padding: "10px 12px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "14px",
              borderBottom: "1px solid #f0f0f0",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "#f5f5f5")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "transparent")
            }
          >
            <Settings sx={{ fontSize: "1rem" }} />
            <span>Edit</span>
          </div>

          <div
            onClick={(e) => {
              e.stopPropagation();
              handleCommentDelete();
              closeActionMenu();
            }}
            style={{
              padding: "10px 12px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "14px",
              borderBottom: "1px solid #f0f0f0",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "#f5f5f5")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "transparent")
            }
          >
            <Settings sx={{ fontSize: "1rem" }} />
            <span>Delete</span>
          </div>
        </>
      )}

      {/* Tags */}
      <div
        onClick={(e) => {
          e.stopPropagation();
          setIsTagging(true);
          closeActionMenu();
        }}
        style={{
          padding: "10px 12px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          fontSize: "14px",
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.backgroundColor = "#f5f5f5")
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.backgroundColor = "transparent")
        }
      >
        <Settings sx={{ fontSize: "1rem" }} />
        <span>Tags</span>
      </div>
    </div>
  );

  return (
    <div
      key={id}
      style={{
        backgroundColor: isHighlighted ? "#c4dd88" : "#ffffff",
        borderRadius: "8px",
        border: "1px solid #e2e6ea",
        borderLeft: `4px solid ${documentColor}`,
        padding: "16px",
        marginBottom: depth > 0 ? "8px" : "12px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.08)",
        width:
          depth > 0
            ? `${300 - 15 * depth}px`
            : position === "left" || position === "right"
            ? "340px"
            : "100%",
        maxWidth: "100%",
        position: "relative",
        transition: "all 0.2s ease",
        overflow: "visible",
        isolation: "isolate",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.12)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.08)";
      }}
    >
      {/* Header: Document info, type badge, and author */}
      <AnnotationCardHeader
        annotation={annotation}
        documentColor={documentColor}
        documentTitle={documentTitle}
        showDocumentInfo={showDocumentInfo}
      />

      {/* Toolbar: Only show for authenticated users */}
      {isAuthenticated && (
        <AnnotationCardToolbar
          annotation={annotation}
          annotationId={id}
          onReplyClick={handleReplyClick}
          onFlagClick={handleFlagClick}
          onEditClick={handleEditClick}
          onDeleteClick={handleCommentDelete}
          onTagsClick={handleTagsMenuClick}
          onLinkClick={
            user && user.id === annotation.creator.id
              ? handleLinkClick
              : undefined
          } // Only for creators
          isReplying={isReplying}
          isFlagging={isFlagging}
          isEditing={isEditing} // Pass editing state
          position={position}
          onActionMenuOpen={handleActionMenuOpen}
          actionButtonRef={actionButtonRef}
        />
      )}

      {/* Content: Body text and tags - Show to everyone */}
      <AnnotationCardContent
        annotation={annotation}
        tags={tags}
        userId={user?.id}
        isTagging={isTagging && isAuthenticated} // Only allow tagging if authenticated
        onRemoveTag={handleRemoveTag}
        onTagSubmit={handleTagSubmit}
        onCloseTagging={handleCloseTagging}
      />

      {/* Show interaction counts for anonymous users */}
      {!isAuthenticated && (
        <div
          style={{
            marginTop: "12px",
            padding: "8px 0",
            borderTop: "1px solid #f0f0f0",
            display: "flex",
            gap: "16px",
            fontSize: "14px",
            color: "#666",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <ThumbUp sx={{ fontSize: "1rem" }} />
            {upvotes?.length || 0} upvotes
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <ChatBubbleOutline sx={{ fontSize: "1rem" }} />
            {replies?.length || 0} replies
          </span>
          <span
            style={{
              marginLeft: "auto",
              fontSize: "12px",
              fontStyle: "italic",
              color: "#999",
            }}
          >
            Login to interact
          </span>
        </div>
      )}

      {/* Editing form - Only for authenticated users */}
      {isEditing && isAuthenticated && (
        <AnnotationEditor
          initialText={annotation.body.value}
          onSave={handleEditSave}
          onCancel={handleEditCancel}
        />
      )}

      {/* Reply/Flag forms - Only for authenticated users */}
      {isAuthenticated && isFlagging && !isReplying && (
        <ReplyForm
          annotation={annotation}
          motivation="flagging"
          onSave={handleFlagSave}
        />
      )}
      {isAuthenticated && isReplying && !isFlagging && (
        <ReplyForm
          annotation={annotation}
          motivation="replying"
          onSave={handleReplySave}
        />
      )}

      {/* Replies section - Show to everyone */}
      <AnnotationCardReplies
        replies={replies}
        depth={depth}
        documentColor={documentColor}
        documentTitle={documentTitle}
        AnnotationCardComponent={AnnotationCard}
        position={position}
      />

      {/* Action menu for side panels - Only for authenticated users */}
      {isAuthenticated &&
        (position === "left" || position === "right") &&
        actionMenuAnchor && (
          <>
            {createPortal(<DropdownMenu />, document.body)}
            {createPortal(
              <div
                style={{
                  position: "fixed",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  zIndex: 9998,
                  backgroundColor: "transparent",
                }}
                onClick={closeActionMenu}
              />,
              document.body
            )}
          </>
        )}

      {/* Regular dropdown for bottom position - Only for authenticated users */}
      {isAuthenticated && position === "bottom" && actionMenuAnchor && (
        <>
          <div
            style={{
              position: "absolute",
              top: "40px",
              right: "80px",
              backgroundColor: "white",
              border: "1px solid #ddd",
              borderRadius: "8px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              zIndex: 9999,
              width: "160px",
              padding: "4px 0",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <DropdownMenu />
          </div>

          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 9998,
              backgroundColor: "transparent",
            }}
            onClick={closeActionMenu}
          />
        </>
      )}
    </div>
  );
};

export default AnnotationCard;
