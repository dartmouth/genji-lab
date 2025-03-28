import React, { ReactNode, HTMLAttributes } from 'react';
import '../styles/ContextMenuStyles.css';

interface MenuContextContainerProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

export const MenuContextContainer: React.FC<MenuContextContainerProps> = ({ 
  children, 
  ...props 
}) => {
  return (
    <div className="menu-context-container" {...props}>
      {children}
    </div>
  );
};

interface ContextButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode;
}

export const ContextButton: React.FC<ContextButtonProps> = ({ 
  children, 
  ...props 
}) => {
  return (
    <button className="context-button" {...props}>
      {children}
    </button>
  );
};

interface ContextMenuProps extends HTMLAttributes<HTMLDivElement> {
  top: number;
  left: number;
  children?: ReactNode;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ 
  top, 
  left, 
  children, 
  ...props 
}) => {
  const menuStyle = {
    top: `${top}px`,
    left: `${left}px`
  };

  return (
    <div className="context-menu" style={menuStyle} {...props}>
      {children}
    </div>
  );
};