import React from "react";
import { MenuContextContainer } from "../styles/styles";

interface MenuProps {
  title: string;
  id: number;
}

const Menu: React.FC<MenuProps> = ({ title, id }) => {
  return (
    <MenuContextContainer key={id}>{title}</MenuContextContainer>
  );
};

export default Menu;