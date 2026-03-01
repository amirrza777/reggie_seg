import { Card } from "@/shared/ui/Card";
import { Placeholder } from "@/shared/ui/Placeholder";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/shared/auth/session";

export default async function StaffDashboardPage() {
  const user = await getCurrentUser();
  if (!user?.isStaff && user?.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return (
    <div className="stack">
      <Placeholder
        title="Staff Overview"
        path="/staff/dashboard"
        description="At-a-glance metrics for submissions, engagement, and risk."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-12">
        <Card title="Grade distribution">
          <p className="muted">Bar chart placeholder.</p>
        </Card>
        <Card title="Submission velocity">
          <p className="muted">Line chart placeholder (submissions vs time).</p>
        </Card>
        <Card title="Engagement score">
          <p className="muted">Radial gauge placeholder (% active in last 48h).</p>
        </Card>
      </div>
    </div>
  );
}
