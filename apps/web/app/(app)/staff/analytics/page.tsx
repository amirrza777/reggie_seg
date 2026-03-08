import { Card } from "@/shared/ui/Card";
import { Placeholder } from "@/shared/ui/Placeholder";
import { Button } from "@/shared/ui/Button";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/shared/auth/session";

export default async function StaffAnalyticsPage() {
  const user = await getCurrentUser();
  if (!user?.isStaff && user?.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return (
    <div className="stack ui-page">
      <Placeholder
        title="Analytics"
        description="Radar charts, exports, and at-risk notifications."
      />

      <div className="stack stack--loose">
        <Card title="Student radar charts">
          <p className="muted">Radar chart grid placeholder (e.g., Technical Work vs Peer Support).</p>
        </Card>
        <Card title="Exports">
          <p className="muted">Buttons to download CSV/PDF snapshots of key charts.</p>
          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <Button variant="ghost" disabled>
              Export CSV
            </Button>
            <Button variant="ghost" disabled>
              Export PDF
            </Button>
          </div>
        </Card>
      </div>

      <Card title="At-risk notifications">
        <p className="muted">
          List of at-risk students with a “Send nudge email” action will appear here.
        </p>
        <div style={{ marginTop: 12 }}>
          <Button variant="ghost" disabled>
            Send nudge email
          </Button>
        </div>
      </Card>
    </div>
  );
}
