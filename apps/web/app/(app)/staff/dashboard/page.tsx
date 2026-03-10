import Link from "next/link";
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
        titleClassName="overview-title"
        description="Start from projects, then drill into teams for peer assessment, peer feedback, repositories, and grading."
      />

      <div className="stack stack--loose">
        <Card title="Team workspace">
          <p className="muted">Project and team-level workflows now live under Staff Projects.</p>
          <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link href="/staff/projects" className="pill-nav__link">Open staff projects</Link>
            <Link href="/staff/peer-assessments" className="pill-nav__link">Module peer assessments</Link>
            <Link href="/staff/health" className="pill-nav__link">Team health</Link>
          </div>
        </Card>
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
