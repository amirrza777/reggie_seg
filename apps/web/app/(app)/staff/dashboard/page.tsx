import Link from "next/link";
import type { ReactElement } from "react";
import { listModules } from "@/features/modules/api/client";
import type { Module } from "@/features/modules/types";
import { getStaffProjectsForMarking, getStaffProjects, type StaffMarkingProject } from "@/features/projects/api/client";
import { getModulesSummary } from "@/features/staff/peerAssessments/api/client";
import { Card } from "@/shared/ui/Card";
import { Table } from "@/shared/ui/Table";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/shared/auth/session";
import { StaffActivityDonutChart } from "@/features/staff/dashboard/components/StaffActivityDonutChart";
import { StaffStudentsBarChart } from "@/features/staff/dashboard/components/StaffStudentsBarChart";
import "@/features/staff/projects/styles/staff-projects.css";

type StaffModuleRow = [string, ReactElement, string, string];

export default async function StaffDashboardPage() {
  const user = await getCurrentUser();
  if (!user?.isStaff && user?.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const [moduleData, markingProjects, staffProjects, peerModules] = await Promise.all([
    loadStaffModules(user.id),
    loadMarkingProjects(user.id),
    loadStaffProjects(user.id),
    loadPeerAssessmentSummary(user.id),
  ]);

  const moduleRows = buildModuleRows(moduleData.modules);

  const totalTeams = moduleData.modules.reduce((sum, m) => sum + (m.teamCount ?? 0), 0);
  const totalProjects = moduleData.modules.reduce((sum, m) => sum + (m.projectCount ?? 0), 0);
  const totalStudents = markingProjects.flatMap((p) => p.teams).reduce((sum, t) => sum + t.studentCount, 0);

  const allTeams = markingProjects.flatMap((p) =>
    p.teams.map((t) => ({ ...t, projectName: p.name, projectId: p.id }))
  );
  const redTeams = allTeams.filter((t) => t.inactivityFlag === "RED");
  const yellowTeams = allTeams.filter((t) => t.inactivityFlag === "YELLOW");
  const healthyTeamCount = allTeams.filter((t) => t.inactivityFlag === "NONE").length;

  const projectStudentData = markingProjects.map((p) => ({
    name: p.name,
    students: p.teams.reduce((sum, t) => sum + t.studentCount, 0),
  }));

  const githubCoverage =
    staffProjects.length > 0
      ? Math.round((staffProjects.filter((p) => p.hasGithubRepo).length / staffProjects.length) * 100)
      : null;
  const totalMembersConnected = staffProjects.reduce((sum, p) => sum + p.membersConnected, 0);
  const totalMembersTotal = staffProjects.reduce((sum, p) => sum + p.membersTotal, 0);
  const githubConnectionRate =
    totalMembersTotal > 0 ? Math.round((totalMembersConnected / totalMembersTotal) * 100) : null;

  return (
    <div className="staff-projects staff-projects--panel-inset">
      <section className="staff-projects__hero">
        <h1 className="staff-projects__title">Staff Overview</h1>
        <p className="staff-projects__desc">
          Manage your modules, review team progress, submit marks, and monitor delivery signals across all your projects.
        </p>
        {moduleData.modules.length > 0 && (
          <div className="staff-projects__meta">
            <span className="staff-projects__badge">{moduleData.modules.length} {pluralize("module", moduleData.modules.length)}</span>
            <span className="staff-projects__badge">{totalProjects} {pluralize("project", totalProjects)}</span>
            <span className="staff-projects__badge">{totalTeams} {pluralize("team", totalTeams)}</span>
            {totalStudents > 0 && (
              <span className="staff-projects__badge">{totalStudents} {pluralize("student", totalStudents)}</span>
            )}
          </div>
        )}
      </section>

      <div className="ui-grid-metrics">
        <div className="ui-metric-card">
          <span className="eyebrow">Modules</span>
          <strong className="ui-metric-value">{moduleData.modules.length}</strong>
        </div>
        <div className="ui-metric-card">
          <span className="eyebrow">Projects</span>
          <strong className="ui-metric-value">{totalProjects}</strong>
        </div>
        <div className="ui-metric-card">
          <span className="eyebrow">Teams</span>
          <strong className="ui-metric-value">{totalTeams}</strong>
        </div>
        <div className="ui-metric-card">
          <span className="eyebrow">Students</span>
          <strong className="ui-metric-value">{totalStudents}</strong>
        </div>
        {githubCoverage !== null && (
          <div className="ui-metric-card">
            <span className="eyebrow">GitHub coverage</span>
            <strong className="ui-metric-value">{githubCoverage}%</strong>
            <span className="muted" style={{ fontSize: "0.8rem" }}>of projects linked</span>
          </div>
        )}
        {githubConnectionRate !== null && (
          <div className="ui-metric-card">
            <span className="eyebrow">Member connection</span>
            <strong className="ui-metric-value">{githubConnectionRate}%</strong>
            <span className="muted" style={{ fontSize: "0.8rem" }}>{totalMembersConnected}/{totalMembersTotal} mapped</span>
          </div>
        )}
      </div>

      <div className="staff-overview__layout">
        <div className="staff-overview__main">
          <StaffModulesCard moduleError={moduleData.moduleError} modules={moduleData.modules} moduleRows={moduleRows} />

          {projectStudentData.length > 1 && (
            <Card title="Students per project">
              <StaffStudentsBarChart projects={projectStudentData} />
            </Card>
          )}
        </div>

        <div className="staff-overview__side">
          {allTeams.length > 0 && (
            <Card title="Team activity">
              <StaffActivityDonutChart
                active={healthyTeamCount}
                lowActivity={yellowTeams.length}
                inactive={redTeams.length}
              />
            </Card>
          )}

          <Card title="Quick actions">
            <div className="staff-overview__quick-actions">
              <Link href="/staff/marks" className="staff-overview__action-link">
                <div>
                  <div>Marking</div>
                  <div className="staff-overview__action-sub">Submit marks and write feedback</div>
                </div>
                <span aria-hidden="true">→</span>
              </Link>
              <Link href="/staff/modules" className="staff-overview__action-link">
                <div>
                  <div>My Modules</div>
                  <div className="staff-overview__action-sub">Manage module settings and access</div>
                </div>
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </Card>

          <Card title="Tools">
            <div className="staff-overview__quick-actions">
              <Link href="/staff/questionnaires" className="staff-overview__action-link">
                <div>
                  <div>Questionnaires</div>
                  <div className="staff-overview__action-sub">Peer assessment templates</div>
                </div>
                <span aria-hidden="true">→</span>
              </Link>
              <Link href="/staff/archive" className="staff-overview__action-link">
                <div>
                  <div>Archive</div>
                  <div className="staff-overview__action-sub">Completed modules and projects</div>
                </div>
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </Card>

          {peerModules.length > 0 && (
            <Card title="Peer assessment completion">
              <p className="ui-note ui-note--muted" style={{ marginBottom: 12 }}>
                Submission rates across your modules.
              </p>
              <div className="staff-overview__peer-list">
                {peerModules.map((mod) => {
                  const pct = mod.expected > 0 ? Math.round((mod.submitted / mod.expected) * 100) : 0;
                  return (
                    <div key={mod.title} className="staff-overview__peer-row">
                      <div className="staff-overview__peer-head">
                        <span className="staff-overview__peer-label">{mod.title}</span>
                        <span className="staff-overview__peer-value">{mod.submitted}/{mod.expected}</span>
                      </div>
                      <div className="staff-overview__peer-track" aria-hidden="true">
                        <span
                          className="staff-overview__peer-fill"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {redTeams.length > 0 && (
            <Card
              title="Teams needing attention"
              action={
                <Link href="/staff/marks" className="btn btn--ghost btn--sm">
                  Go to marking
                </Link>
              }
            >
              <p className="ui-note ui-note--muted">
                {redTeams.length} {pluralize("team", redTeams.length)} with significant inactivity detected.
              </p>
              <ul className="staff-overview__team-list">
                {redTeams.map((team) => (
                  <li key={team.id} className="staff-overview__team-row">
                    <span>
                      <Link href={`/staff/projects/${team.projectId}`} className="ui-link-reset">
                        {team.teamName}
                      </Link>
                      <span className="muted" style={{ marginLeft: 6 }}>— {team.projectName}</span>
                    </span>
                    <span className="staff-overview__team-flag staff-overview__team-flag--red">Inactive</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {yellowTeams.length > 0 && (
            <Card title="Low activity teams">
              <p className="ui-note ui-note--muted">
                {yellowTeams.length} {pluralize("team", yellowTeams.length)} with reduced activity.
              </p>
              <ul className="staff-overview__team-list">
                {yellowTeams.map((team) => (
                  <li key={team.id} className="staff-overview__team-row">
                    <span>
                      <Link href={`/staff/projects/${team.projectId}`} className="ui-link-reset">
                        {team.teamName}
                      </Link>
                      <span className="muted" style={{ marginLeft: 6 }}>— {team.projectName}</span>
                    </span>
                    <span className="staff-overview__team-flag staff-overview__team-flag--yellow">Low activity</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {redTeams.length === 0 && yellowTeams.length === 0 && allTeams.length > 0 && (
            <Card title="Team health">
              <p className="ui-note ui-note--muted">All {allTeams.length} teams are active — no inactivity flags raised.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

async function loadStaffModules(userId: number): Promise<{ modules: Module[]; moduleError: string | null }> {
  try {
    const modules = await listModules(userId, { scope: "staff" });
    return { modules, moduleError: null };
  } catch {
    return { modules: [], moduleError: "Could not load your modules right now. Please try again." };
  }
}

async function loadMarkingProjects(userId: number): Promise<StaffMarkingProject[]> {
  try {
    return await getStaffProjectsForMarking(userId);
  } catch {
    return [];
  }
}

async function loadStaffProjects(userId: number) {
  try {
    return await getStaffProjects(userId);
  } catch {
    return [];
  }
}

async function loadPeerAssessmentSummary(userId: number) {
  try {
    return await getModulesSummary(userId);
  } catch {
    return [];
  }
}

function buildModuleRows(modules: Module[]): StaffModuleRow[] {
  return modules.map((module) => {
    const moduleCode = formatModuleCode(module);
    const teams = module.teamCount ?? 0;
    const projects = module.projectCount ?? 0;

    return [
      moduleCode,
      <Link key={module.id} href={`/staff/modules/${encodeURIComponent(module.id)}`} className="ui-link-reset">
        {module.title}
      </Link>,
      `${teams} ${pluralize("team", teams)}`,
      `${projects} ${pluralize("project", projects)}`,
    ];
  });
}

function StaffModulesCard({
  moduleError,
  modules,
  moduleRows,
}: {
  moduleError: string | null;
  modules: Module[];
  moduleRows: StaffModuleRow[];
}) {
  return (
    <Card
      title="My Modules"
      action={
        <Link href="/staff/modules" className="btn btn--ghost btn--sm">
          View all
        </Link>
      }
    >
      {moduleError ? <p className="muted">{moduleError}</p> : null}
      {!moduleError && modules.length === 0 ? (
        <p className="muted">No modules are currently assigned to your account.</p>
      ) : null}
      {!moduleError && modules.length > 0 ? (
        <Table headers={["Code", "Module", "Teams", "Projects"]} rows={moduleRows} />
      ) : null}
    </Card>
  );
}

function formatModuleCode(module: Module): string {
  if (module.code?.trim()) return module.code.trim();
  const numericId = Number(module.id);
  if (Number.isFinite(numericId)) return `MOD-${numericId}`;
  return module.id;
}

function pluralize(label: string, count: number): string {
  return count === 1 ? label : `${label}s`;
}
