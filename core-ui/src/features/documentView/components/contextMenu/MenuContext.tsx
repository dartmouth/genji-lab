import React, { useState, useEffect } from "react";
import { ContextMenu, ContextButton } from "./ContextMenuComponents";
import { useAppDispatch, useAppSelector, selectSegments, setMotivation, selectAnnotationCreate } from "@store";
import { createPortal } from 'react-dom';
import { useAuth } from "@hooks/useAuthContext";

const MenuContext: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const text = useAppSelector(selectSegments);
  const annotationCreate = useAppSelector(selectAnnotationCreate);
  
  const [clicked, setClicked] = useState(false);
  
  const [coords, setCoords] = useState<{ x: number; y: number }>({
    x: 0, y: 0
  });

  useEffect(() => {
    if (annotationCreate && annotationCreate.motivation && clicked) {
      setClicked(false);
    }
  }, [annotationCreate, clicked]);

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

    const handleClick = (e: MouseEvent) => {
      const target = e.target as Element;
      const contextMenu = document.querySelector('.context-menu');
      
      if (!contextMenu || !contextMenu.contains(target)) {
        setClicked(false);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setClicked(false);
      }
    };

    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("click", handleClick);
    document.addEventListener("keydown", handleEscape);
    
    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("click", handleClick);
      document.removeEventListener("keydown", handleEscape);
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
          }}
        >
          {"Create Comment"}
        </ContextButton>
        {(user?.roles?.includes('admin') || user?.roles?.includes('verified_scholar')) && (
          <ContextButton 
            key={`context-button-${2}`} 
            onClick={(e: React.MouseEvent) => {
              e.preventDefault();
              e.stopPropagation();
              dispatch(setMotivation("scholarly"));
            }}
          >
          {"Create Scholarly Annotation"}
        </ContextButton>
      )}
    </ContextMenu>,
    document.body
  );
};

export default MenuContext;