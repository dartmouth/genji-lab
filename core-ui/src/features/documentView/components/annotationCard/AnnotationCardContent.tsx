import React, { useState } from "react";
import { Annotation } from "@documentView/types";
import { TagList, TagInput } from "@documentView/components";

interface AnnotationCardContentProps {
  annotation: Annotation;
  tags: Annotation[];
  userId?: number;
  isTagging: boolean;
  onRemoveTag: (tagId: string | number) => void;
  onTagSubmit: (tags: string[]) => void;
  onCloseTagging: () => void;
}

const AnnotationCardContent: React.FC<AnnotationCardContentProps> = ({
  annotation,
  tags,
  userId,
  isTagging,
  onRemoveTag,
  onTagSubmit,
  onCloseTagging,
}) => {
  const TRUNCATE_LENGTH = 500;
  const [isExpanded, setIsExpanded] = useState(false);

  const content = annotation.body.value;
  const shouldTruncate = content.length > TRUNCATE_LENGTH;
  const displayContent =
    shouldTruncate && !isExpanded
      ? content.substring(0, TRUNCATE_LENGTH) + "..."
      : content;

  // Function to parse and render markdown links
  const renderContentWithLinks = (textContent: string) => {
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = linkRegex.exec(textContent)) !== null) {
      const [fullMatch, linkText, url] = match;
      const matchStart = match.index;

      // Add text before the link
      if (matchStart > lastIndex) {
        parts.push(textContent.substring(lastIndex, matchStart));
      }

      // Add the link as a clickable element
      parts.push(
        <a
          key={`link-${matchStart}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: "#1976d2",
            textDecoration: "underline",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "#1565c0";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "#1976d2";
          }}
        >
          {linkText}
        </a>
      );

      lastIndex = matchStart + fullMatch.length;
    }

    // Add remaining text after the last link
    if (lastIndex < textContent.length) {
      parts.push(textContent.substring(lastIndex));
    }

    return parts.length > 0 ? parts : [textContent];
  };

  const renderedContent = renderContentWithLinks(displayContent);

  return (
    <>
      {/* Annotation Content with Link Support */}
      <div
        style={{
          fontSize: "14px",
          lineHeight: 1.6,
          color: "#212529",
          marginBottom: shouldTruncate ? "8px" : "16px",
          whiteSpace: "pre-wrap",
        }}
      >
        {renderedContent.map((part, index) => (
          <React.Fragment key={index}>{part}</React.Fragment>
        ))}
      </div>

      {/* Show More/Less Button */}
      {shouldTruncate && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          style={{
            background: "none",
            border: "none",
            color: "#1976d2",
            cursor: "pointer",
            fontSize: "13px",
            fontWeight: 500,
            padding: "4px 0",
            marginBottom: "16px",
            textDecoration: "underline",
            transition: "color 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#1565c0")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#1976d2")}
        >
          {isExpanded ? "Show less" : "Show more"}
        </button>
      )}

      {/* Tags */}
      <TagList tags={tags} userId={userId} onRemoveTag={onRemoveTag} />

      {/* Tag Input */}
      {isTagging && (
        <TagInput onSubmit={onTagSubmit} onClose={onCloseTagging} />
      )}
    </>
  );
};

export default AnnotationCardContent;
