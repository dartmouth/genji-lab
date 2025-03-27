// useContextMenu.ts
import { useState, useEffect } from "react";

const useContextMenu = () => {
  const [clicked, setClicked] = useState(false);
  const [points, setPoints] = useState({
    x: 0,
    y: 0,
  });
  const [selectedText, setSelectedText] = useState("");

  useEffect(() => {
    const handleClick = () => setClicked(false);
    document.addEventListener("click", handleClick);
    
    // Add listener for text selection
    const handleSelection = () => {
      const selection = window.getSelection();
      setSelectedText(selection ? selection.toString() : "");
    };
    
    document.addEventListener("mouseup", handleSelection);
    
    return () => {
      document.removeEventListener("click", handleClick);
      document.removeEventListener("mouseup", handleSelection);
    };
  }, []);
  
  return {
    clicked,
    setClicked,
    points,
    setPoints,
    selectedText
  };
};

export default useContextMenu;