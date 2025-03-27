// MenuContext.tsx
import React, { useState, useEffect } from "react";
import { ContextMenu, ContextButton } from "../styles/styles";

interface MenuItem {
  id: number | string;
  title: string;
}

interface MenuContextProps {
  data: MenuItem[];
  selectedText: string;
  position: { x: number; y: number };
  setCreateComment: (value: boolean) => void;
  setCreateAnnotation: (value: boolean) => void;
}

const MenuContext: React.FC<MenuContextProps> = ({ selectedText, 
  //position, 
  setCreateComment, setCreateAnnotation }) => {
  const [clicked, setClicked] = useState(false);
  
  const [coords, setCoords] = useState<{ x: number; y: number }>({
    x: 0, y: 0
  });

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      if (selectedText && selectedText.trim().length > 0) {
        e.preventDefault();
        console.log("Context menu opened at: ", e.pageX, e.pageY);
        setCoords({ x: e.pageX, y: e.pageY });
        setClicked(true);
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
  }, [selectedText]);

  if (!clicked || !selectedText) return null;

  return (
    <ContextMenu top={coords.y} left={coords.x}>
        <ContextButton 
          key={1} 
          onClick={() => {
            // Handle menu item click
            console.log(`Clicked Create Comment for text: ${selectedText}`);
            // Add your action handling here
            setCreateComment(true);
            setClicked(false);
          }}
        >
          {"Create Comment"}
        </ContextButton>
        <ContextButton 
          key={2} 
          onClick={() => {
            // Handle menu item click
            console.log(`Clicked Create Annotation for text: ${selectedText}`);
            // Add your action handling here
            setCreateAnnotation(true);
            setClicked(false);
          }}
        >
          {"Create Scholarly Annotation"}
        </ContextButton>
    </ContextMenu>
  );
};

export default MenuContext;