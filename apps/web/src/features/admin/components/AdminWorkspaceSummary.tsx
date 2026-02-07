import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";

const overview = [
  { label: "Users", value: 132, hint: "User + RefreshToken records" },
  { label: "Modules", value: 19, hint: "Module + ModuleLead ownership" },
  { label: "Teams", value: 20, hint: "Team + TeamAllocation links" },
  { label: "Meetings", value: 65, hint: "Meeting + MeetingMinutes" },
];

export function AdminWorkspaceSummary() {
  return (
    <Card
      title="Admin workspace"
      action={
        <div style={{ display: "flex", gap: 8 }}>
          <Button type="button">Invite admin</Button>
          <Button type="button" variant="ghost">
            Audit log
          </Button>
        </div>
      }
    >
      <p className="muted">
        Super user view that maps directly to the Prisma models: users, modules, teams, and meetings.
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 12,
        }}
      >
        {overview.map((item) => (
          <div
            key={item.label}
            className="stack"
            style={{
              gap: 4,
              padding: "12px 14px",
              borderRadius: 12,
              border: "1px solid var(--border)",
              background: "var(--surface)",
            }}
          >
            <span className="eyebrow">{item.label}</span>
            <strong style={{ fontSize: 22, letterSpacing: "-0.02em" }}>{item.value}</strong>
            <span className="muted">{item.hint}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
