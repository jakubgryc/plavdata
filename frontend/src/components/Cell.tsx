import React from "react";
import "./Cell.css";

export interface CellProps {
  content: React.ReactNode;

  className?: string;

  isHeader?: boolean;

  onClick?: () => void;

  colSpan?: number;

  style?: React.CSSProperties;
}

const Cell: React.FC<CellProps> = ({
  content,
  className = "",
  isHeader = false,
  onClick,
  colSpan,
  style,
}) => {
  const Element = isHeader ? "th" : "td";

  return (
    <Element
      className={`grid-cell ${className}`}
      onClick={onClick}
      colSpan={colSpan}
      style={style}
    >
      {content}
    </Element>
  );
};

export default Cell;
