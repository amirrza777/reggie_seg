import type { CSSProperties } from "react";

type SkeletonProps = {
  className?: string;
  width?: CSSProperties["width"];
  height?: CSSProperties["height"];
  radius?: CSSProperties["borderRadius"];
  inline?: boolean;
};

type SkeletonTextProps = {
  className?: string;
  lines?: number;
  lineHeight?: CSSProperties["height"];
  widths?: Array<CSSProperties["width"]>;
};

function joinClassNames(...parts: Array<string | undefined | false>) {
  return parts.filter(Boolean).join(" ");
}

export function Skeleton({ className, width, height, radius, inline = false }: SkeletonProps) {
  const style: CSSProperties = {};
  if (width !== undefined) {
    style.width = width;
  }
  if (height !== undefined) {
    style.height = height;
  }
  if (radius !== undefined) {
    style.borderRadius = radius;
  }

  return (
    <span
      aria-hidden="true"
      className={joinClassNames("ui-skeleton", inline ? "ui-skeleton--inline" : "ui-skeleton--block", className)}
      style={style}
    />
  );
}

export function SkeletonText({ className, lines = 3, lineHeight = "0.9rem", widths }: SkeletonTextProps) {
  const totalLines = Math.max(1, lines);

  return (
    <div className={joinClassNames("ui-skeleton-text", className)} aria-hidden="true">
      {Array.from({ length: totalLines }).map((_, index) => {
        const width = widths?.[index] ?? (index === totalLines - 1 ? "72%" : "100%");
        return <Skeleton key={index} inline className="ui-skeleton-text__line" height={lineHeight} width={width} />;
      })}
    </div>
  );
}
