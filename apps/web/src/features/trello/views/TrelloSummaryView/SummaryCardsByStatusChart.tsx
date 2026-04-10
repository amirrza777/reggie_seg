// Summary panel: pie chart of card counts by status

"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { CardCountByStatus } from "@/features/trello/lib/velocity";
import { ChartTooltipContent } from "@/shared/ui/ChartTooltipContent";
import { usePieCursorTooltip } from "@/shared/ui/usePieCursorTooltip";

type Props = { counts: CardCountByStatus };

const PIE_ENTRIES = [
  { name: "Backlog", key: "backlog" as const, color: "var(--color-fixed-0079bf)" },
  { name: "In progress", key: "inProgress" as const, color: "var(--color-fixed-f2d600)" },
  { name: "Completed", key: "completed" as const, color: "var(--color-fixed-61bd4f)" },
  { name: "Information only", key: "informationOnly" as const, color: "var(--color-fixed-97a0af)" },
];

function getSummaryPieData(counts: CardCountByStatus) {
  return PIE_ENTRIES.filter((entry) => counts[entry.key] > 0).map((entry) => ({
    name: entry.name,
    value: counts[entry.key],
    color: entry.color,
  }));
}

function SummaryCardsByStatusChartPlot({ pieData }: { pieData: Array<{ name: string; value: number; color: string }> }) {
  const { containerHandlers, pieHandlers, tooltipProps, pieTooltipContentProps } = usePieCursorTooltip();
  return (
    <div className="ui-no-select" style={{ width: "100%", flex: 1, minHeight: 0, display: "flex", alignItems: "center", padding: "8px 16px 24px" }} {...containerHandlers}>
      <div style={{ width: "100%", height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 8, right: 16, bottom: 8, left: 16 }} accessibilityLayer={false}>
            <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={48} outerRadius={72} paddingAngle={2} isAnimationActive rootTabIndex={-1} {...pieHandlers}>
              {pieData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
            </Pie>
            <Tooltip content={<ChartTooltipContent {...pieTooltipContentProps} />} formatter={(value, name) => [value, name]} {...tooltipProps} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function SummaryCardsByStatusChart({ counts }: Props) {
  const pieData = getSummaryPieData(counts);

  return (
    <section className="placeholder stack" style={{ padding: 20, height: "100%" }}>
      <h2 className="eyebrow">Cards by status</h2>
      {counts.total > 0 && pieData.length > 0 ? <SummaryCardsByStatusChartPlot pieData={pieData} /> : <p className="muted">No cards yet.</p>}
    </section>
  );
}
