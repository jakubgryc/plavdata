import React, { useState, useEffect, useRef } from "react";
import Row from "./Row";
import Cell from "./Cell";
import "./Grid.css";

export interface Column<T> {
  key: string;
  header: string;
  render: (item: T) => React.ReactNode;
  width?: string | number;
  className?: string;
}

export interface GridProps<T> {
  data: T[];
  columns: Column<T>[];
  className?: string;
  onRowClick?: (item: T, index: number) => void;
  onCellClick?: (
    item: T,
    column: Column<T>,
    rowIndex: number,
    colIndex: number
  ) => void;
  keyExtractor?: (item: T, index: number) => string | number;
  caption?: string;
  style?: React.CSSProperties;
  emptyText?: string;
  headerClassName?: string;
  bodyClassName?: string;
}

function Grid<T>({
  data,
  columns,
  className = "",
  onRowClick,
  onCellClick,
  keyExtractor = (_, index) => index,
  caption,
  style,
  emptyText = "No data available",
  headerClassName,
  bodyClassName = "",
}: GridProps<T>) {
  return (
    <div className="grid-container">
      {caption && <div className="grid-caption">{caption}</div>}
      <table className={`data-grid ${className}`} style={style}>
        <thead className={headerClassName}>
          <Row isHeader>
            {columns.map((column, index) => (
              <Cell
                key={column.key}
                content={column.header}
                isHeader
                style={{
                  ...(index === 0
                    ? {
                        position: "sticky",
                        left: 0,
                        zIndex: 1,
                        backgroundColor: "#f9f9f9",
                      }
                    : {}),
                }}
                className={column.className}
              />
            ))}
          </Row>
        </thead>
        <tbody className={bodyClassName}>
          {data.length > 0 ? (
            data.map((item, rowindex) => (
              <Row
                key={keyExtractor(item, rowindex + 1)}
                onClick={
                  onRowClick ? () => onRowClick(item, rowindex) : undefined
                }
              >
                {columns.map((column, index) => (
                  <Cell
                    key={index + 1}
                    content={column.render(item)}
                    className={column.className}
                    isHeader={index === 0}
                    style={{
                      position: index === 0 ? "sticky" : "static",
                      left: index === 0 ? 0 : undefined,
                      backgroundColor:
                        index === 0 && rowindex % 2 === 0
                          ? "#d3d3d3"
                          : undefined,
                    }}
                    onClick={
                      onCellClick
                        ? () => onCellClick(item, column, rowindex, index)
                        : undefined
                    }
                  />
                ))}
              </Row>
            ))
          ) : (
            <Row>
              <Cell
                content={emptyText}
                colSpan={columns.length}
                className="empty-data-cell"
              />
            </Row>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default Grid;
