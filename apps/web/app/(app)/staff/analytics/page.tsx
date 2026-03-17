import Link from "next/link";
import { getStaffProjects } from "@/features/projects/api/client";
import { Card } from "@/shared/ui/Card";
import { redirect } from "next/navigation";
import { getCurrentUser, isElevatedStaff } from "@/shared/auth/session";

export default async function StaffAnalyticsPage() {
  const user = await getCurrentUser();
  if (!isElevatedStaff(user)) {
    redirect("/dashboard");
  }

  let projects: Awaited<ReturnType<typeof getStaffProjects>> = [];
  let errorMessage: string | null = null;

  try {
    projects = await getStaffProjects(user.id);
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Failed to load analytics.";
  }

  const moduleCount = new Set(projects.map((project) => project.moduleId)).size;
  const teamCount = projects.reduce((sum, project) => sum + project.teamCount, 0);
  const studentsTotal = projects.reduce((sum, project) => sum + project.membersTotal, 0);
  const studentsConnected = projects.reduce((sum, project) => sum + project.membersConnected, 0);
  const githubConnectionRate = studentsTotal > 0 ? Math.round((studentsConnected / studentsTotal) * 100) : 0;
  const projectsWithoutRepo = projects.filter((project) => !project.hasGithubRepo).length;
  const projectsWithoutTeams = projects.filter((project) => project.teamCount === 0).length;
  const lowConnectionProjects = projects.filter(
    (project) => project.membersTotal > 0 && project.membersConnected / project.membersTotal < 0.5,
  ).length;
  const oldestProjectDays = projects.reduce((max, project) => Math.max(max, project.daysOld), 0);

  return (
    <div className="stack ui-page">
      <header className="ui-page__header">
        <h1 className="overview-title ui-page__title">Analytics</h1>
        <p className="ui-page__description">
          Project-level delivery and engagement indicators across your staff workspace.
        </p>
      </header>

      {errorMessage ? <p className="muted">{errorMessage}</p> : null}

      {!errorMessage && projects.length === 0 ? (
        <Card title="No analytics yet">
          <p className="muted">
            No staff projects are available yet. Create or open projects to start tracking analytics indicators.
          </p>
          <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link href="/staff/modules" className="pill-nav__link">
              Open modules
            </Link>
            <Link href="/staff/projects" className="pill-nav__link">
              Open projects
            </Link>
          </div>
        </Card>
      ) : null}

      {!errorMessage && projects.length > 0 ? (
        <>
          <Card title="Workspace summary">
            <div className="ui-grid-metrics">
              {[
                { label: "Modules", value: moduleCount },
                { label: "Projects", value: projects.length },
                { label: "Teams", value: teamCount },
                { label: "Students", value: studentsTotal },
                { label: "GitHub connected", value: `${githubConnectionRate}%` },
              ].map((item) => (
                <div key={item.label} className="ui-metric-card">
                  <span className="eyebrow">{item.label}</span>
                  <strong className="ui-metric-value">{item.value}</strong>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Priority checks">
            <div className="ui-grid-metrics">
              {[
                { label: "Projects without repo", value: projectsWithoutRepo },
                { label: "Projects without teams", value: projectsWithoutTeams },
                { label: "Low GitHub coverage projects", value: lowConnectionProjects },
                { label: "Oldest project age (days)", value: oldestProjectDays },
              ].map((item) => (
                <div key={item.label} className="ui-metric-card">
                  <span className="eyebrow">{item.label}</span>
                  <strong className="ui-metric-value">{item.value}</strong>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Explore detailed views">
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Link href="/staff/projects" className="pill-nav__link">
                Team health by project
              </Link>
              <Link href="/staff/repos" className="pill-nav__link">
                Repository analytics
              </Link>
              <Link href="/staff/integrations" className="pill-nav__link">
                Trello velocity
              </Link>
            </div>
          </Card>
        </>
      ) : null}
    </div>
  );
}
