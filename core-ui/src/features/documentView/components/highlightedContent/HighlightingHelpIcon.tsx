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
  const tooltipRef = React.useRef<HTMLDivElement>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);

  // Adjust tooltip position to keep it on screen
  React.useEffect(() => {
    if (isTooltipVisible && tooltipRef.current && buttonRef.current) {
      const tooltip = tooltipRef.current;
      // const button = buttonRef.current;
      const tooltipRect = tooltip.getBoundingClientRect();

      // Check if tooltip goes off the right edge
      if (tooltipRect.right > window.innerWidth) {
        tooltip.style.right = "0";
        tooltip.style.left = "auto";
      }

      // Check if tooltip goes off the bottom edge
      if (tooltipRect.bottom > window.innerHeight) {
        tooltip.style.bottom = "100%";
        tooltip.style.top = "auto";
        tooltip.style.marginBottom = "8px";
        tooltip.style.marginTop = "0";
      }
    }
  }, [isTooltipVisible]);

  const highlightTypes = [
    {
      type: "Comment",
      description: (
        <>
          Personal comments and notes.{" "}
          <strong>
            Highlight and right-click on text to create a comment.
          </strong>
        </>
      ),
      colorClass: "highlight-comment",
      backgroundColor: '#785EF0',
      borderColor: "#785EF0",
    },
    {
      type: "Scholarly Annotation",
      description: (
        <>
          Academic analysis and scholarly notes.{" "}
          <strong>
            Highlight and right-click on text to create a scholarly annotation.
          </strong>
        </>
      ),
      colorClass: "highlight-scholarly",
      backgroundColor: "#DC267F",
      borderColor: "#DC267F",
    },
    {
      type: "Linked Text",
      description: (
        <>
          Text connected to other documents.{" "}
          <strong>Right-click and hover over "View Linked Text"</strong>
        </>
      ),
      colorClass: "highlight-linked",
      backgroundColor: "#ffae00ac",
      borderColor: "#ffae00ac",
    },
    {
      type: "Navigation Highlight",
      description: "Temporarily highlighted during navigation",
      colorClass: "highlight-navigation",
      backgroundColor: "#FE6100",
      borderColor: "#FE6100",
    },
  ];

  return (
    <div className={`highlighting-help-container ${className}`}>
      <button
        ref={buttonRef}
        className="highlighting-help-icon"
        onMouseEnter={() => setIsTooltipVisible(true)}
        onMouseLeave={() => setIsTooltipVisible(false)}
        onClick={() => setIsTooltipVisible(!isTooltipVisible)}
        aria-label="Show highlighting legend"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z" />
        </svg>
      </button>

      {isTooltipVisible && (
        <div ref={tooltipRef} className="highlighting-help-tooltip">
          <div className="tooltip-header">
            <h4>Text Highlighting Guide</h4>
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
                  Lorem Ipsum
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
