import type { CSSProperties, ReactNode } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { Skeleton } from "./Skeleton";

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
  isLoading?: boolean;
  loadingLabel?: string;
  loadingRowCount?: number;
};

const SKELETON_WIDTHS = ["88%", "72%", "64%", "84%", "58%", "70%"] as const;

export function Table({
  headers,
  rows,
  columnTemplate,
  className,
  headClassName,
  rowClassName,
  sortConfig,
  onSort,
  isLoading = false,
  loadingLabel = "Loading table data",
  loadingRowCount = 6,
}: TableProps) {
  const gridStyle: CSSProperties | undefined = columnTemplate
    ? { gridTemplateColumns: columnTemplate }
    : undefined;
  const tableClass = ["table", className].filter(Boolean).join(" ");
  const headClass = ["table__head", headClassName].filter(Boolean).join(" ");
  const rowClass = ["table__row", rowClassName].filter(Boolean).join(" ");
  const shouldRenderSkeleton = isLoading && rows.length === 0;
  const visibleRows = shouldRenderSkeleton
    ? Array.from({ length: Math.max(1, loadingRowCount) }, () => Array.from({ length: headers.length }, () => null))
    : rows;

  return (
    <div className={tableClass} aria-busy={isLoading ? true : undefined}>
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
      {visibleRows.map((row, rowIdx) => (
        <div className={rowClass} key={rowIdx} style={gridStyle}>
          {row.map((cell, cellIdx) => (
            <div key={cellIdx}>
              {shouldRenderSkeleton ? (
                <Skeleton
                  inline
                  height="0.95rem"
                  width={SKELETON_WIDTHS[(rowIdx + cellIdx) % SKELETON_WIDTHS.length]}
                  radius="999px"
                />
              ) : (
                cell
              )}
            </div>
          ))}
        </div>
      ))}
      {shouldRenderSkeleton ? <span className="ui-visually-hidden">{loadingLabel}</span> : null}
    </div>
  );
}
