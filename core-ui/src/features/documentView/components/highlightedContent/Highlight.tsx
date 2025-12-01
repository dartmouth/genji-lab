import { useRef, useEffect } from "react";
import { useDispatch } from "react-redux";
import { registerHighlight, removeHighlight } from "@store";
import { FaFlag } from 'react-icons/fa';

interface HighlightProps {
  id: string;
  documentId: number;
  motivation: string;
  position: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
  annotationId: string;
  color?: string;
  isFlagged?: boolean;
}

const Highlight: React.FC<HighlightProps> = ({
  id,
  documentId,
  position,
  annotationId,
  motivation,
  isFlagged = false,
}) => {
  const color = motivation == "commenting" ? "#785EF0" : "#DC267F";
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(
      registerHighlight({
        id,
        documentId,
        motivation: motivation,
        boundingBoxes: [position],
        annotationId,
      }),
      []
    );

    return () => {
      dispatch(removeHighlight({ documentId: documentId, highlightId: id }));
    };
  }, [dispatch, id, documentId, annotationId, motivation, position]);

  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={containerRef}
      style={{ position: "absolute", pointerEvents: "none" }}
    >
      <div
        style={{
          position: "absolute",
          backgroundColor: color,
          opacity: 0.3,
          left: `${position.left}px`,
          top: `${position.top}px`,
          width: `${position.width}px`,
          height: `${position.height}px`,
          pointerEvents: "none",
          userSelect: "none",
          zIndex: 1,
          transition: "opacity 0.2s ease",
        }}
      />
      {isFlagged && (
        <div
          style={{
            position: "absolute",
            left: `${position.left - 2}px`,
            top: `${position.top - 2}px`,
            backgroundColor: "#dc3545",
            color: "white",
            padding: "2px 4px",
            borderRadius: "3px",
            fontSize: "10px",
            fontWeight: "bold",
            zIndex: 10,
            pointerEvents: "none",
            boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
            display: "flex",
            alignItems: "center",
            gap: "2px",
          }}
        >
          <FaFlag style={{ fontSize: "8px" }} />
        </div>
      )}
    </div>
  );
};

export default Highlight;
