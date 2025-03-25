import React, { useEffect } from "react";
import useContextMenu from "../hooks/useContextMenu";
import { ContextMenu } from "../styles/styles";

interface MenuItem {
  id: string | number;
  title: string;
}

interface MenuContextHookProps {
  data: MenuItem[];
}

const MenuContext: React.FC<MenuContextHookProps> = ({ data }) => {
  const { clicked, setClicked, points, setPoints, selectedText } = useContextMenu();

  useEffect(() => {
    // Handle right-click on document
    const handleContextMenu = (e: MouseEvent) => {
      // Only show context menu if text is selected
      const selection = window.getSelection();
      if (selection && selection.toString().trim().length > 0) {
        e.preventDefault();
        setClicked(true);
        setPoints({
          x: e.pageX,
          y: e.pageY,
        });
      }
    };

    document.addEventListener("contextmenu", handleContextMenu);
    
    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
    };
  }, [setClicked, setPoints]);

  return (
    <div>
      {clicked && selectedText && (
        <ContextMenu top={points.y} left={points.x}>
          <ul>
            <li>Create Annotation</li>
            <li>Create Comment</li>
          </ul>
        </ContextMenu>
      )}
    </div>
  );
};

export default MenuContext;