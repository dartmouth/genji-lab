// src/features/documentView/components/HighlightingHelpIcon.tsx
import React, { useState } from "react";
import "@documentView/styles/DocumentLinkingStyles.css";

interface HighlightingHelpIconProps {
  className?: string;
}

const HighlightingHelpIcon: React.FC<HighlightingHelpIconProps> = ({
  className = "",
}) => {
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);

  const highlightTypes = [
    {
      type: "Comment",
      description: "Personal comments and notes",
      colorClass: "highlight-comment",
      backgroundColor: "rgba(196, 221, 136, 0.3)",
      borderColor: "#c4dd88",
    },
    {
      type: "Scholarly Annotation",
      description: "Academic analysis and scholarly notes",
      colorClass: "highlight-scholarly",
      backgroundColor: "rgba(171, 247, 255, 0.3)",
      borderColor: "#abf7ff",
    },
    {
      type: "Linked Text",
      description: "Text connected to other documents",
      colorClass: "highlight-linked",
      backgroundColor: "rgba(244, 67, 54, 0.15)",
      borderColor: "#f44336",
    },
    {
      type: "Navigation Highlight",
      description: "Temporarily highlighted during navigation",
      colorClass: "highlight-navigation",
      backgroundColor: "rgba(255, 235, 59, 0.35)",
      borderColor: "#ffeb3b",
    },
  ];

  return (
    <div className={`highlighting-help-container ${className}`}>
      <button
        className="highlighting-help-icon"
        onMouseEnter={() => setIsTooltipVisible(true)}
        onMouseLeave={() => setIsTooltipVisible(false)}
        onClick={() => setIsTooltipVisible(!isTooltipVisible)}
        aria-label="Show highlighting legend"
        title="Show highlighting legend"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z" />
        </svg>
      </button>

      {isTooltipVisible && (
        <div className="highlighting-help-tooltip">
          <div className="tooltip-header">
            <h4>Text Highlighting Guide</h4>
            <button
              className="tooltip-close"
              onClick={() => setIsTooltipVisible(false)}
              aria-label="Close help"
            >
              ×
            </button>
          </div>

          <div className="tooltip-content">
            {highlightTypes.map((highlight) => (
              <div key={highlight.type} className="highlight-example">
                <div
                  className="highlight-sample"
                  style={{
                    backgroundColor: highlight.backgroundColor,
                    border: `1px solid ${highlight.borderColor}`,
                  }}
                >
                  Sample text
                </div>
                <div className="highlight-info">
                  <div className="highlight-type">{highlight.type}</div>
                  <div className="highlight-description">
                    {highlight.description}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default HighlightingHelpIcon;
