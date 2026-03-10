import Link from "next/link";
import { listModules } from "@/features/modules/api/client";
import type { Module } from "@/features/modules/types";
import { Card } from "@/shared/ui/Card";
import { Placeholder } from "@/shared/ui/Placeholder";
import { Table } from "@/shared/ui/Table";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/shared/auth/session";

export default async function StaffDashboardPage() {
  const user = await getCurrentUser();
  if (!user?.isStaff && user?.role !== "ADMIN") {
    redirect("/dashboard");
  }

  let modules: Module[] = [];
  let moduleError: string | null = null;

  try {
    modules = await listModules(user.id, { scope: "staff" });
  } catch {
    moduleError = "Could not load your modules right now. Please try again.";
  }

  const moduleRows = modules.map((module) => {
    const numericId = Number(module.id);
    const moduleCode = Number.isFinite(numericId) ? `MOD-${numericId}` : module.id;
    const teams = module.teamCount ?? 0;
    const projects = module.projectCount ?? 0;

    return [
      moduleCode,
      <Link key={module.id} href={`/modules/${encodeURIComponent(module.id)}`} className="ui-link-reset">
        {module.title}
      </Link>,
      `${teams} team${teams === 1 ? "" : "s"}`,
      `${projects} project${projects === 1 ? "" : "s"}`,
    ];
  });

  return (
    <div className="stack ui-page">
      <Placeholder
        title="Staff Overview"
        titleClassName="overview-title"
        description="Start from projects, then drill into teams for peer assessment, peer feedback, repositories, and grading."
      />

      <Card title="My Modules">
        {moduleError ? <p className="muted">{moduleError}</p> : null}
        {!moduleError && modules.length === 0 ? (
          <p className="muted">No modules are currently assigned to your account.</p>
        ) : null}
        {!moduleError && modules.length > 0 ? (
          <Table headers={["Code", "Module", "Teams", "Projects"]} rows={moduleRows} />
        ) : null}
      </Card>

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
