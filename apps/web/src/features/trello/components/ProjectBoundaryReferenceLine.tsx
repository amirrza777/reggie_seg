"use client";

import { ReferenceLine } from "recharts";

type LabelViewBox = { x?: number; y?: number };

type ProjectBoundaryReferenceLineProps = {
  x: number;
  color: string;
  title: string;
  dateLabel: string;
};

function renderBoundaryLabel({
  viewBox,
  color,
  title,
  dateLabel,
}: {
  viewBox?: LabelViewBox;
  color: string;
  title: string;
  dateLabel: string;
}) {
  const x = viewBox?.x ?? 0;
  const y = (viewBox?.y ?? 0) - 8;

  return (
    <text x={x} y={y} textAnchor="middle" fill={color} fontSize={11}>
      <tspan x={x} dy="0">
        {title}
      </tspan>
      <tspan x={x} dy="14" fontSize={10} opacity={0.9}>
        {dateLabel}
      </tspan>
    </text>
  );
}

export function ProjectBoundaryReferenceLine({
  x,
  color,
  title,
  dateLabel,
}: ProjectBoundaryReferenceLineProps) {
  return (
    <ReferenceLine
      x={x}
      stroke={color}
      strokeDasharray="4 4"
      label={({ viewBox }: { viewBox?: LabelViewBox }) =>
        renderBoundaryLabel({
          viewBox,
          color,
          title,
          dateLabel,
        })
      }
    />
  );
}
