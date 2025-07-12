import React from "react";
import "./Row.css";

export interface RowProps {
  children: React.ReactNode;
  className?: string;
  isHeader?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}

const Row: React.FC<RowProps> = ({
  children,
  className = "",
  isHeader = false,
  onClick,
  style,
}) => {
  return (
    <tr
      className={`grid-row ${className} ${isHeader ? "header-row" : ""}`}
      onClick={onClick}
      style={style}
    >
      {children}
    </tr>
  );
};

export default Row;
