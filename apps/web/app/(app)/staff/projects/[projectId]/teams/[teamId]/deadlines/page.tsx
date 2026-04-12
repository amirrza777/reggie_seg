import { getStaffProjectTeams } from "@/features/staff/projects/server/getStaffProjectTeamsCached";
import { StaffStudentDeadlineOverridesPanel } from "@/features/staff/projects/components/StaffStudentDeadlineOverridesPanel";
import { StaffTeamDeadlineProfileControl } from "@/features/staff/projects/components/StaffTeamDeadlineProfileControl";
import { getCurrentUser } from "@/shared/auth/session";
import "@/features/staff/projects/styles/staff-projects.css";

type StaffProjectTeamDeadlinesPageProps = {
  params: Promise<{ projectId: string; teamId: string }>;
  searchParams?: Promise<{ studentId?: string }>;
};

export default async function StaffProjectTeamDeadlinesPage({ params, searchParams }: StaffProjectTeamDeadlinesPageProps) {
  const { projectId, teamId } = await params;
  const userId = (await getCurrentUser())!.id;
  const numericProjectId = Number(projectId);
  const numericTeamId = Number(teamId);
  if (Number.isNaN(numericProjectId) || Number.isNaN(numericTeamId)) {
    return <p className="muted">Invalid project or team ID.</p>;
  }

  let data: Awaited<ReturnType<typeof getStaffProjectTeams>> | null = null;
  let errorMessage: string | null = null;
  try {
    data = await getStaffProjectTeams(userId, numericProjectId);
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Failed to load team data.";
  }

  const team = data?.teams.find((item) => item.id === numericTeamId);
  const query = searchParams ? await searchParams : {};
  const initialStudentId = Number(query.studentId);

  if (!data || !team) {
    return (
      <div className="stack">
        <p className="muted">{errorMessage ?? "Team not found in this project."}</p>
      </div>
    );
  }

  const members = team.allocations.map((allocation) => ({
    id: allocation.user.id,
    firstName: allocation.user.firstName,
    lastName: allocation.user.lastName,
    email: allocation.user.email,
  }));

  const deadlinesReadOnly = Boolean(data.project.moduleArchivedAt);

  return (
    <div className="staff-projects">
      <section className="staff-projects__team-policy" aria-label="Deadline policy controls">
        <div className="staff-projects__team-policy-top">
          <div>
            <h2 className="staff-projects__team-policy-title">Team deadline policy</h2>
            <p className="staff-projects__team-policy-desc">
              Switch the team profile and then apply per-student overrides only where needed.
            </p>
          </div>
          <span
            className={`staff-projects__policy-pill${
              team.deadlineProfile === "MCF" ? " staff-projects__policy-pill--mcf" : ""
            }`}
          >
            {team.deadlineProfile === "MCF" ? "MCF extended" : "Standard"}
          </span>
        </div>
        <div className="staff-projects__team-policy-actions">
          <StaffTeamDeadlineProfileControl
            teamId={team.id}
            initialProfile={team.deadlineProfile === "MCF" ? "MCF" : "STANDARD"}
            readOnly={deadlinesReadOnly}
          />
        </div>
      </section>

      <StaffStudentDeadlineOverridesPanel
        projectId={numericProjectId}
        members={members}
        initialStudentId={Number.isInteger(initialStudentId) && initialStudentId > 0 ? initialStudentId : null}
        readOnly={deadlinesReadOnly}
      />
    </div>
  );
}
