import type { CSSProperties, ReactNode } from "react";

type TableProps = {
  headers: string[];
  rows: Array<Array<ReactNode>>;
  columnTemplate?: string;
  className?: string;
  headClassName?: string;
  rowClassName?: string;
};

export function Table({ headers, rows, columnTemplate, className, headClassName, rowClassName }: TableProps) {
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
          <div key={idx}>{header}</div>
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
