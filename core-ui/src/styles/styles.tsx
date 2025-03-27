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

export const ContextButton = styled.button`
  width: 100%;
  padding: 12px 16px;
  background-color: white;
  border: none;
  text-align: left;
  color: #00693e; /* Dartmouth Green */
  font-size: 14px;
  cursor: pointer;
  border-radius: 3px;
  margin: 2px 0;
  
  &:hover {
    background-color: #f0f0f0;
  }
  
  &:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(0, 105, 62, 0.3);
  }
`;

// Update ContextMenu if needed
export const ContextMenu = styled.div<ContextMenuProps>`
  position: absolute;
  width: 200px;
  background-color: white;
  border-radius: 5px;
  box-sizing: border-box;
  z-index: 1000;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  
  ${({ top, left }) => css`
    top: ${top}px;
    left: ${left}px;
  `}
`;