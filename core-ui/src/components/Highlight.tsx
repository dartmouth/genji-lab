import { useState, useRef, useCallback, useEffect } from "react";

interface HighlightProps {
    position: {
      left: number;
      top: number;
      width: number;
      height: number;
    };
    onMouseEnter?: (e: React.MouseEvent) => void;
    onMouseLeave?: (e: React.MouseEvent) => void;
    color?: string;
    id?: string;
  }
  
  const Highlight: React.FC<HighlightProps> = ({
    position,
    onMouseEnter,
    onMouseLeave,
    color = 'yellow',
    id
  }) => {
    const [isHovering, setIsHovering] = useState(false);
    const borderThickness = 6;
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    
    // Create a container for all our elements
    const containerRef = useRef<HTMLDivElement>(null);
    
    // Handle mouse enter with debounce to prevent flickering
    const handleMouseEnter = useCallback((e: React.MouseEvent) => {
      // Clear any pending leave timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      if (!isHovering) {
        setIsHovering(true);
        onMouseEnter?.(e);
      }
    }, [isHovering, onMouseEnter]);
    
    // Handle mouse leave with a slight delay to prevent flickering
    const handleMouseLeave = useCallback((e: React.MouseEvent) => {
      // Check if we're leaving to another element within our highlight
      const toElement = e.relatedTarget as Node;
      if (containerRef.current?.contains(toElement)) {
        return; // Still within our component
      }
      
      // Set a small timeout to prevent flickering when moving between border elements
      timeoutRef.current = setTimeout(() => {
        setIsHovering(false);
        onMouseLeave?.(e);
      }, 50);
    }, [onMouseLeave]);
    
    // Clean up timeout on unmount
    useEffect(() => {
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }, []);
    
    return (
      <div ref={containerRef} style={{ position: 'absolute', pointerEvents: 'none' }}>
        {/* Main highlight */}
        <div
          style={{
            position: 'absolute',
            backgroundColor: color,
            opacity: isHovering ? 0.7 : 0.5,
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
        
        {/* Four border elements for better mouse tracking */}
        <div
          style={{
            position: 'absolute',
            left: `${position.left - borderThickness}px`,
            top: `${position.top - borderThickness}px`,
            width: `${position.width + (borderThickness * 2)}px`,
            height: `${borderThickness}px`,
            backgroundColor: 'transparent',
            pointerEvents: 'auto',
            cursor: 'pointer',
            zIndex: 2,
          }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          data-highlight-id={id}
          data-border="top"
        />
        
        <div
          style={{
            position: 'absolute',
            left: `${position.left - borderThickness}px`,
            top: `${position.top + position.height}px`,
            width: `${position.width + (borderThickness * 2)}px`,
            height: `${borderThickness}px`,
            backgroundColor: 'transparent',
            pointerEvents: 'auto',
            cursor: 'pointer',
            zIndex: 2,
          }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          data-highlight-id={id}
          data-border="bottom"
        />
        
        <div
          style={{
            position: 'absolute',
            left: `${position.left - borderThickness}px`,
            top: `${position.top}px`,
            width: `${borderThickness}px`,
            height: `${position.height}px`,
            backgroundColor: 'transparent',
            pointerEvents: 'auto',
            cursor: 'pointer',
            zIndex: 2,
          }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          data-highlight-id={id}
          data-border="left"
        />
        
        <div
          style={{
            position: 'absolute',
            left: `${position.left + position.width}px`,
            top: `${position.top}px`,
            width: `${borderThickness}px`,
            height: `${position.height}px`,
            backgroundColor: 'transparent',
            pointerEvents: 'auto',
            cursor: 'pointer',
            zIndex: 2,
          }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          data-highlight-id={id}
          data-border="right"
        />
      </div>
    );
  };

  export default Highlight