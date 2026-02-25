import type { CSSProperties, ReactNode } from "react";

type TableProps = {
  headers: string[];
  rows: Array<Array<ReactNode>>;
  columnTemplate?: string;
};

export function Table({ headers, rows, columnTemplate }: TableProps) {
  const gridStyle: CSSProperties | undefined = columnTemplate
    ? { gridTemplateColumns: columnTemplate }
    : undefined;

  return (
    <div className="table">
      <div className="table__head" style={gridStyle}>
        {headers.map((header, idx) => (
          <div key={idx}>{header}</div>
        ))}
      </div>
      {rows.map((row, rowIdx) => (
        <div className="table__row" key={rowIdx} style={gridStyle}>
          {row.map((cell, cellIdx) => (
            <div key={cellIdx}>{cell}</div>
          ))}
        </div>
      ))}
    </div>
  );
}
