import type { ReactNode } from "react";

type TableProps = {
  headers: string[];
  rows: ReactNode[][];
  emptyState?: ReactNode;
};

export function Table({ headers, rows, emptyState }: TableProps) {
  const hasRows = rows.length > 0;
  return (
    <div className="table">
      <div className="table__head">
        {headers.map((header) => (
          <span key={header}>{header}</span>
        ))}
      </div>
      <div className="table__body">
        {hasRows
          ? rows.map((row, idx) => (
              <div key={idx} className="table__row">
                {row.map((cell, cellIdx) => (
                  <span key={cellIdx}>{cell}</span>
                ))}
              </div>
            ))
          : emptyState ?? <p className="muted">No data yet.</p>}
      </div>
    </div>
  );
}
