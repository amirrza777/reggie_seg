import type { CSSProperties, ReactNode } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";

export type SortConfig = {
  column: number;
  direction: "asc" | "desc";
};

type TableProps = {
  headers: ReactNode[];
  rows: Array<Array<ReactNode>>;
  columnTemplate?: string;
  className?: string;
  headClassName?: string;
  rowClassName?: string;
  sortConfig?: SortConfig;
  onSort?: (columnIndex: number) => void;
};

export function Table({ headers, rows, columnTemplate, className, headClassName, rowClassName, sortConfig, onSort }: TableProps) {
  const gridStyle: CSSProperties | undefined = columnTemplate
    ? { gridTemplateColumns: columnTemplate }
    : undefined;
  const tableClass = ["table", className].filter(Boolean).join(" ");
  const headClass = ["table__head", headClassName].filter(Boolean).join(" ");
  const rowClass = ["table__row", rowClassName].filter(Boolean).join(" ");

  return (
    <div className={tableClass}>
      <div className={headClass} style={gridStyle}>
        {headers.map((header, idx) => (
          <div
            key={idx}
            className={onSort ? "table__header--sortable" : undefined}
            onClick={onSort ? () => onSort(idx) : undefined}
          >
            {header}
            {sortConfig?.column === idx && (
              <span className="table__sort-indicator">
                {sortConfig.direction === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </span>
            )}
          </div>
        ))}
      </div>
      {rows.map((row, rowIdx) => (
        <div className={rowClass} key={rowIdx} style={gridStyle}>
          {row.map((cell, cellIdx) => (
            <div key={cellIdx}>{cell}</div>
          ))}
        </div>
      ))}
    </div>
  );
}
