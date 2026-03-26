import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { CardCountByStatus } from "@/features/trello/lib/velocity";
import { ChartTooltipContent } from "@/shared/ui/ChartTooltipContent";

type Props = { counts: CardCountByStatus };

const PIE_ENTRIES = [
  { name: "Backlog", key: "backlog" as const, color: "#0079bf" },
  { name: "In progress", key: "inProgress" as const, color: "#f2d600" },
  { name: "Completed", key: "completed" as const, color: "#61bd4f" },
  { name: "Information only", key: "informationOnly" as const, color: "#97a0af" },
];

export function SummaryCardsByStatusChart({ counts }: Props) {
  const pieData = PIE_ENTRIES.filter((d) => counts[d.key] > 0).map((d) => ({
    name: d.name,
    value: counts[d.key],
    color: d.color,
  }));

  return (
    <section className="placeholder stack" style={{ padding: 20, height: "100%" }}>
      <h2 className="eyebrow">Cards by status</h2>
      {counts.total > 0 && pieData.length > 0 ? (
        <div style={{ width: "100%", flex: 1, minHeight: 0, display: "flex", alignItems: "center", padding: "8px 16px 24px" }}>
          <div style={{ width: "100%", height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 8, right: 16, bottom: 8, left: 16 }}>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={72}
                  paddingAngle={2}
                >
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltipContent />} formatter={(value, name) => [value, name]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <p className="muted">No cards yet.</p>
      )}
    </section>
  );
}
