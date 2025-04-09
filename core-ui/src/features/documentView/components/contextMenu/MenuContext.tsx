import React, { useState, useEffect } from "react";
import { ContextMenu, ContextButton } from "./ContextMenuComponents";
import { useAppDispatch, useAppSelector, selectSegments, setMotivation  } from "@store";
import { createPortal } from 'react-dom';

const MenuContext: React.FC = () => {
  const dispatch = useAppDispatch();
  const text = useAppSelector(selectSegments);

  const [clicked, setClicked] = useState(false);
  
  const [coords, setCoords] = useState<{ x: number; y: number }>({
    x: 0, y: 0
  });

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      if (text && text.length > 0) {
        e.preventDefault();
        setCoords({ x: e.pageX, y: e.pageY});
        setClicked(true);
      } else {
        console.log("No text selected or text is empty"); 
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

  if (!clicked || !text) {
    return null;
  }

  return createPortal(
    <ContextMenu top={coords.y} left={coords.x}>
        <ContextButton 
          key={`context-button-${1}`} 
          onClick={(e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
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