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
}

const MenuContext: React.FC<MenuContextProps> = ({ data, selectedText, position }) => {
  const [clicked, setClicked] = useState(false);
  
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      if (selectedText && selectedText.trim().length > 0) {
        e.preventDefault();
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
    <ContextMenu top={position.y} left={position.x}>
      {data.map((item) => (
        <ContextButton 
          key={item.id} 
          onClick={() => {
            // Handle menu item click
            console.log(`Clicked ${item.title} for text: ${selectedText}`);
            // Add your action handling here
            setClicked(false);
          }}
        >
          {item.title}
        </ContextButton>
      ))}
    </ContextMenu>
  );
};

export default MenuContext;