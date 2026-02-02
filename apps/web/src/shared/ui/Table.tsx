import type { ReactNode } from "react";

type TableProps = {
  headers: string[];
  rows: Array<Array<ReactNode>>;
};

export function Table({ headers, rows }: TableProps) {
  return (
    <div className="table">
      <div className="table__head">
        {headers.map((header, idx) => (
          <div key={idx}>{header}</div>
        ))}
      </div>
      {rows.map((row, rowIdx) => (
        <div className="table__row" key={rowIdx}>
          {row.map((cell, cellIdx) => (
            <div key={cellIdx}>{cell}</div>
          ))}
        </div>
      ))}
    </div>
  );
}
