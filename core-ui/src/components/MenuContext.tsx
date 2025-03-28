// MenuContext.tsx
import React, { useState, useEffect, useRef } from "react";
import { ContextMenu, ContextButton } from "../styles/styles";
import { useAppDispatch, useAppSelector } from "../store/hooks/useAppDispatch";
import { selectSelectedText, setMotivation } from '../store/slice/annotationCreate';
import { createPortal } from 'react-dom';

const MenuContext: React.FC = () => {
  const dispatch = useAppDispatch();
  const text = useAppSelector(selectSelectedText);

  const [clicked, setClicked] = useState(false);
  
  const [coords, setCoords] = useState<{ x: number; y: number }>({
    x: 0, y: 0
  });
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      if (text && text.trim().length > 0) {
        e.preventDefault();
        setCoords({ x: e.pageX, y: e.pageY});
        setClicked(true);
      } else {
        console.log("No text selected or text is empty"); // Debug log
      }
    };

    const handleClick = () => {
      setClicked(false);
    };

    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("click", handleClick);
    
    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("click", handleClick);
    };
  }, [text]);

  const handleClick = (e: MouseEvent) => {
    // Only close if click is outside the menu
    if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
      setClicked(false);
    }
  };

  if (!clicked || !text) {
    return null;
  }

  return createPortal(
    <ContextMenu ref={menuRef} top={coords.y} left={coords.x}>
        <ContextButton 
          key={`context-button-${1}`} 
          onClick={(e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            console.log(`Clicked Create Comment for text: ${text}`);
            dispatch(setMotivation("commenting"));
            setClicked(false);
          }}
        >
          {"Create Comment"}
        </ContextButton>
        <ContextButton 
          key={`context-button-${2}`} 
          onClick={(e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            console.log(`Clicked Create Annotation for text: ${text}`);
            dispatch(setMotivation("scholarly"));
            setClicked(false);
          }}
        >
          {"Create Scholarly Annotation"}
        </ContextButton>
    </ContextMenu>,
    document.body
  );
};

export default MenuContext;