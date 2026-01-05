import React from "react";
import { LuPanelLeft, LuPanelRight, LuPanelBottom } from "react-icons/lu";
import { FaTimes } from "react-icons/fa";

export type PanelPosition = "bottom" | "right" | "left";

export interface PanelControlsProps {
  position: PanelPosition;
  onChangePosition: (position: PanelPosition) => void;
  onToggleVisibility?: () => void;
}

const PanelControls: React.FC<PanelControlsProps> = ({
  position,
  onChangePosition,
  onToggleVisibility,
}) => {
  const getPanelControlsStyles = () => {
    if (position === "bottom") {
      return {
        display: "flex",
        alignItems: "center",
        gap: "4px",
      };
    } else {
      return {
        display: "flex",
        flexDirection: "row" as const,
        justifyContent: "space-between",
        width: "100%",
        paddingTop: "4px",
      };
    }
  };

  const getButtonStyle = (isActive: boolean) => ({
    border: "none",
    borderRadius: "4px",
    backgroundColor: isActive ? "#e9ecef" : "transparent",
    color: isActive ? "#212529" : "#6c757d",
    width: "26px",
    height: "26px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  });

  return (
    <div className="panel-controls" style={getPanelControlsStyles()}>
      <div style={{ display: "flex", gap: "4px" }}>
        {/* Left Position Button */}
        <button
          style={getButtonStyle(position === "left")}
          onClick={() => onChangePosition("left")}
          title="Left panel"
        >
          <LuPanelLeft />
        </button>

        {/* Bottom Position Button */}
        <button
          style={getButtonStyle(position === "bottom")}
          onClick={() => onChangePosition("bottom")}
          title="Bottom panel"
        >
          <LuPanelBottom />
        </button>

        {/* Right Position Button */}
        <button
          style={getButtonStyle(position === "right")}
          onClick={() => onChangePosition("right")}
          title="Right panel"
        >
          <LuPanelRight />
        </button>
      </div>

      {/* Hide Panel Button */}
      {onToggleVisibility && (
        <button
          style={{
            border: "none",
            borderRadius: "4px",
            backgroundColor: "transparent",
            color: "#6c757d",
            width: "26px",
            height: "26px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
          onClick={onToggleVisibility}
          title="Hide panel"
        >
          <FaTimes />
        </button>
      )}
    </div>
  );
};

export default PanelControls;
