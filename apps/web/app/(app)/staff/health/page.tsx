import { Card } from "@/shared/ui/Card";
import { Placeholder } from "@/shared/ui/Placeholder";
import { Button } from "@/shared/ui/Button";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/shared/auth/session";

export default async function TeamHealthPage() {
  const user = await getCurrentUser();
  if (!user?.isStaff && user?.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return (
    <div className="stack">
      <Placeholder
        title="Team health & red flags"
        path="/staff/health"
        description="Identify variance, conflicts, and meeting needs."
      />

      <Card title="High priority (conflict alerts)">
        <p className="muted">List of teams/students with high score variance will appear here.</p>
        <div style={{ marginTop: 12 }}>
          <Button variant="secondary" disabled>
            Request meeting
          </Button>
        </div>
      </Card>

      <Card title="Team health table">
        <p className="muted">Table placeholder: avg score, std dev, submissions done/pending.</p>
      </Card>
    </div>
  );
}
