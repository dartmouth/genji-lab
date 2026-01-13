import React, { useState, useEffect, useRef, useCallback } from "react";
import { Annotation } from "@documentView/types/annotation";
import PanelHeader from "./tabbedAnnotationsPanel/PanelHeader";
import AnnotationsList from "./tabbedAnnotationsPanel/AnnotationsList";
import "../styles/TabbedAnnotationsPanel.css";

export type AnnotationType =
  | "commenting"
  | "scholarly"
  | "replying"
  | "tagging"
  | "upvoting"
  | "flagging";
export type PanelPosition = "bottom" | "right" | "left";

interface TabbedAnnotationsPanelProps {
  documents: Array<{
    id: number;
    title: string;
    color?: string;
  }>;
  annotations: Annotation[];
  activeDocumentId?: number;
  isHovering?: boolean;
  position?: PanelPosition;
  onChangePosition?: (position: PanelPosition) => void;
  onToggleVisibility?: () => void;
  onPanelSizeChange?: (size: number) => void;
  flaggedAnnotationId?: string | null;
}

const TabbedAnnotationsPanel: React.FC<TabbedAnnotationsPanelProps> = ({
  documents,
  annotations,
  activeDocumentId,
  isHovering = false,
  position = "bottom",
  onChangePosition,
  onToggleVisibility,
  onPanelSizeChange,
  flaggedAnnotationId = null,
}) => {
  // State for active tab: 'doc-{id}' for document tabs or 'all' for all annotations
  const [activeTab, setActiveTab] = useState<string>(
    activeDocumentId ? `doc-${activeDocumentId}` : "all"
  );

  // Resize state
  const [panelSize, setPanelSize] = useState<number>(
    position === "bottom" ? 300 : 400
  );
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Force style update when panelSize changes
  useEffect(() => {
    if (panelRef.current) {
      if (position === "bottom") {
        panelRef.current.style.height = `${panelSize}px`;
        panelRef.current.style.minHeight = `${panelSize}px`;
        panelRef.current.style.maxHeight = `${panelSize}px`;
      } else {
        panelRef.current.style.width = `${panelSize}px`;
        panelRef.current.style.minWidth = `${panelSize}px`;
        panelRef.current.style.maxWidth = `${panelSize}px`;
      }
    }
  }, [panelSize, position]);

  // Notify parent when panel size changes (only for left/right positions)
  useEffect(() => {
    if (onPanelSizeChange && (position === "left" || position === "right")) {
      onPanelSizeChange(panelSize);
    }
  }, [panelSize, position, onPanelSizeChange]);

  // Filter annotations based on active tab
  const getFilteredAnnotations = () => {
    if (activeTab === "all") {
      return annotations;
    } else {
      const docId = Number(activeTab.replace("doc-", ""));
      return annotations.filter((anno) => anno.document_id === docId);
    }
  };

  const filteredAnnotations = getFilteredAnnotations();

  // Get document title by ID
  const getDocumentTitle = (docId: number) => {
    const doc = documents.find((d) => d.id === docId);
    return doc?.title || `Document ${docId}`;
  };

  // Update active tab when activeDocumentId changes
  useEffect(() => {
    if (activeDocumentId) {
      setActiveTab(`doc-${activeDocumentId}`);
    }
  }, [activeDocumentId]);

  // Handle mouse down on resize handle
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
  }, []);

  // Handle mouse move during resize
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing || !panelRef.current) return;

      // Get constraints based on position
      const constraints =
        position === "bottom" ? { min: 200, max: 600 } : { min: 300, max: 700 };

      const { min, max } = constraints;
      let newSize: number;

      if (position === "bottom") {
        // For bottom panel, calculate from bottom of viewport
        const mouseY = e.clientY;
        const viewportHeight = window.innerHeight;
        newSize = viewportHeight - mouseY;
      } else if (position === "right") {
        // For right panel, calculate from right edge of viewport
        const mouseX = e.clientX;
        const viewportWidth = window.innerWidth;
        newSize = viewportWidth - mouseX;
      } else {
        // For left panel, calculate from left edge
        newSize = e.clientX;
      }

      // Constrain size
      newSize = Math.max(min, Math.min(max, newSize));
      setPanelSize(newSize);
    },
    [isResizing, position]
  );

  // Handle mouse up to stop resizing
  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  // Add/remove mouse event listeners
  useEffect(() => {
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      // Prevent text selection while dragging
      document.body.style.userSelect = "none";
      document.body.style.cursor =
        position === "bottom" ? "ns-resize" : "ew-resize";

      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.style.userSelect = "";
        document.body.style.cursor = "";
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp, position]);

  // Reset size when position changes
  useEffect(() => {
    setPanelSize(position === "bottom" ? 300 : 400);
  }, [position]);

  // Get resize handle styles based on position
  const getResizeHandleStyle = (): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      position: "absolute",
      zIndex: 10,
      backgroundColor: "transparent",
      transition: isResizing ? "none" : "background-color 0.2s",
    };

    if (position === "bottom") {
      return {
        ...baseStyle,
        top: 0,
        left: 0,
        right: 0,
        height: "6px",
        cursor: "ns-resize",
      };
    } else if (position === "right") {
      return {
        ...baseStyle,
        top: 0,
        left: 0,
        bottom: 0,
        width: "6px",
        cursor: "ew-resize",
      };
    } else {
      return {
        ...baseStyle,
        top: 0,
        right: 0,
        bottom: 0,
        width: "6px",
        cursor: "ew-resize",
      };
    }
  };

  // Get panel styles based on position
  const getPanelStyle = (): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      backgroundColor: "#f9f9f9",
      position: "relative",
    };

    if (position === "bottom") {
      return {
        ...baseStyle,
        height: `${panelSize}px`,
        minHeight: `${panelSize}px`,
        maxHeight: `${panelSize}px`,
      };
    } else {
      return {
        ...baseStyle,
        height: "100%",
        width: `${panelSize}px`,
        minWidth: `${panelSize}px`,
        maxWidth: `${panelSize}px`,
      };
    }
  };

  return (
    <div
      ref={panelRef}
      className={`tabbed-annotations-panel position-${position}`}
      style={getPanelStyle()}
    >
      {/* Resize Handle */}
      <div
        className="resize-handle"
        onMouseDown={handleMouseDown}
        style={getResizeHandleStyle()}
        onMouseEnter={(e) => {
          if (!isResizing) {
            e.currentTarget.style.backgroundColor = "rgba(0, 0, 0, 0.1)";
          }
        }}
        onMouseLeave={(e) => {
          if (!isResizing) {
            e.currentTarget.style.backgroundColor = "transparent";
          }
        }}
        title={`Drag to resize ${position === "bottom" ? "height" : "width"}`}
      />

      {/* Panel Header with Tabs and Controls */}
      <PanelHeader
        documents={documents}
        annotations={annotations}
        activeTab={activeTab}
        position={position}
        onTabChange={setActiveTab}
        onChangePosition={onChangePosition}
        onToggleVisibility={onToggleVisibility}
      />

      {/* Annotations Content */}
      <div
        style={{
          flex: 1,
          overflow: "auto",
          padding: "10px",
        }}
      >
        <AnnotationsList
          annotations={filteredAnnotations}
          position={position}
          isHovering={isHovering}
          activeTab={activeTab}
          documents={documents}
          getDocumentTitle={getDocumentTitle}
          flaggedAnnotationId={flaggedAnnotationId}
        />
      </div>
    </div>
  );
};

export default TabbedAnnotationsPanel;
