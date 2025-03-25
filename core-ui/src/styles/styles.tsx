import styled, { css } from "styled-components";

export const MenuContextContainer = styled.div`
  border: 1px solid #ffffff2d;
  border-radius: 4px;
  padding: 18px;
  margin: 5px 0;
  box-sizing: border-box;
`;

interface ContextMenuProps {
  top: number;
  left: number;
}

export const ContextMenu = styled.div<ContextMenuProps>`
  position: absolute;
  width: 200px;
  background-color: white; /* Changed to white */
  border-radius: 5px;
  box-sizing: border-box;
  z-index: 1000;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2); /* Slightly lighter shadow for white background */
  opacity: 1;
  
  ${({ top, left }) => css`
    top: ${top}px;
    left: ${left}px;
  `}
  
  ul {
    box-sizing: border-box;
    padding: 10px;
    margin: 0;
    list-style: none;
    position: relative;
    color: #00693e; /* Dartmouth Green text color */
  }
  
  ul li {
    padding: 18px 12px;
    position: relative;
    z-index: 10;
    background-color: white; /* Match parent white background */
    margin: 2px 0;
    border-radius: 3px;
    pointer-events: auto;
  }
  
  /* hover */
  ul li:hover {
    cursor: pointer;
    background-color: #f0f0f0; /* Light gray hover instead of black */
    color: #00693e; /* Keep Dartmouth Green text on hover */
  }
`;