import Link from "next/link";
import { redirect } from "next/navigation";
import { getStaffProjectTeams } from "@/features/projects/api/client";
import { getCurrentUser } from "@/shared/auth/session";
import "@/features/staff/projects/styles/staff-projects.css";
import { StaffTeamSectionNav } from "@/features/staff/projects/components/StaffTeamSectionNav";

type StaffProjectTeamTabsPageProps = {
  params: Promise<{ projectId: string; teamId: string }>;
};

function getInitials(firstName: string, lastName: string) {
  const first = firstName?.trim()?.[0] ?? "";
  const last = lastName?.trim()?.[0] ?? "";
  return `${first}${last}`.toUpperCase() || "?";
}

export default async function StaffProjectTeamTabsPage({ params }: StaffProjectTeamTabsPageProps) {
  const user = await getCurrentUser();
  if (!user?.isStaff && user?.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const { projectId, teamId } = await params;
  const numericProjectId = Number(projectId);
  const numericTeamId = Number(teamId);
  if (Number.isNaN(numericProjectId) || Number.isNaN(numericTeamId)) {
    return <p className="muted">Invalid project or team ID.</p>;
  }

  let data: Awaited<ReturnType<typeof getStaffProjectTeams>> | null = null;
  let errorMessage: string | null = null;
  try {
    data = await getStaffProjectTeams(user.id, numericProjectId);
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Failed to load team data.";
  }

  const team = data?.teams.find((item) => item.id === numericTeamId);

  if (!data || !team) {
    return (
      <div className="stack">
        <p className="muted">{errorMessage ?? "Team not found in this project."}</p>
        <Link href={`/staff/projects/${projectId}`} className="pill-nav__link" style={{ width: "fit-content" }}>
          Back to project teams
        </Link>
      </div>
    );
  }

  return (
    <div className="staff-projects">
      <section className="staff-projects__hero">
        <p className="staff-projects__eyebrow">Team</p>
        <h1 className="staff-projects__title">{team.teamName}</h1>
        <p className="staff-projects__desc">Project: {data.project.name}</p>
        <div className="staff-projects__meta">
          <span className="staff-projects__badge">{team.allocations.length} member{team.allocations.length === 1 ? "" : "s"}</span>
          <Link href={`/staff/projects/${data.project.id}`} className="staff-projects__badge">
            Back to teams
          </Link>
        </div>
      </section>

      <StaffTeamSectionNav projectId={projectId} teamId={teamId} />

      <section className="staff-projects__grid" aria-label="Team overview quick actions">
        <article className="staff-projects__card">
          <h3 className="staff-projects__card-title">Team health</h3>
          <p className="staff-projects__card-sub">
            Use peer-assessment completion, peer-feedback evidence, and repository activity together to spot risks early.
          </p>
          <Link href={`/staff/projects/${data.project.id}/teams/${team.id}/peer-assessment`} className="staff-projects__card-action">
            Open assessment signals
          </Link>
        </article>
        <article className="staff-projects__card">
          <h3 className="staff-projects__card-title">Coordination</h3>
          <p className="staff-projects__card-sub">
            Check meetings and scheduler data to track team operating rhythm and identify inactive periods.
          </p>
          <Link href={`/staff/projects/${data.project.id}/teams/${team.id}/team-meetings`} className="staff-projects__card-action">
            Open meeting timeline
          </Link>
        </article>
      </section>

      <section className="staff-projects__team-card" aria-label="Team members">
        <h3 style={{ margin: 0 }}>Team members</h3>
        <p className="muted" style={{ margin: 0 }}>
          Use the tabs above to open peer assessment, peer feedback, repositories, meetings, and trello.
        </p>
        {team.allocations.length === 0 ? <p className="muted" style={{ margin: 0 }}>No students assigned yet.</p> : null}
        <div className="staff-projects__members">
        {team.allocations.map((allocation) => (
          <div key={allocation.userId} className="staff-projects__member">
            <div className="staff-projects__avatar">
              {getInitials(allocation.user.firstName, allocation.user.lastName)}
            </div>
            <div>
              <p className="staff-projects__member-name">
                {allocation.user.firstName} {allocation.user.lastName}
              </p>
              <p className="staff-projects__member-email">{allocation.user.email}</p>
            </div>
            <button
              type="button"
              className="staff-projects__member-placeholder-btn"
              disabled
              title="Notification workflow placeholder"
            >
              Notify student
            </button>
          </div>
        ))}
        </div>
      </section>
    </div>
  );
}
