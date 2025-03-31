import { useRef, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { registerHighlight, removeHighlight } from '../store/slice/highlightRegistrySlice';

interface HighlightProps {
    id: string,
    motivation: string
    position: {
      left: number;
      top: number;
      width: number;
      height: number;
    };
    annotationId: string,
    color?: string;
  }
  
  const Highlight: React.FC<HighlightProps> = ({
    id,
    position,
    annotationId,
    motivation,
    // color = '#c4dd88'
  }) => {
    const color = motivation == 'commenting' ? '#c4dd88' : '#abf7ff'
    const dispatch = useDispatch();

    useEffect(() => {
      dispatch(registerHighlight({
        id,
        motivation: motivation,
        boundingBoxes: [position],
        annotationId
      }), []);

      return () => {
        dispatch(removeHighlight(id));
      };
    }, [dispatch, id, annotationId, motivation, position]);
    
    const containerRef = useRef<HTMLDivElement>(null);
    
    return (
      <div ref={containerRef} style={{ position: 'absolute', pointerEvents: 'none' }}>
        {/* Main highlight */}
        <div
          style={{
            position: 'absolute',
            backgroundColor: color,
            opacity: 0.3,
            left: `${position.left}px`,
            top: `${position.top}px`,
            width: `${position.width}px`,
            height: `${position.height}px`,
            pointerEvents: 'none',
            userSelect: 'none',
            zIndex: 1,
            transition: 'opacity 0.2s ease',
          }}
        />
      </div>
    );
  };

  export default Highlight