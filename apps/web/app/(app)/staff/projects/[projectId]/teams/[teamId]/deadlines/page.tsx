import { getStaffTeamContext } from "@/features/staff/projects/lib/staffTeamContext";
import { StaffStudentDeadlineOverridesPanel } from "@/features/staff/projects/components/StaffStudentDeadlineOverridesPanel";
import { StaffTeamDeadlineProfileControl } from "@/features/staff/projects/components/StaffTeamDeadlineProfileControl";

type StaffProjectTeamDeadlinesPageProps = {
  params: Promise<{ projectId: string; teamId: string }>;
  searchParams?: Promise<{ studentId?: string }>;
};

export default async function StaffProjectTeamDeadlinesPage({ params, searchParams }: StaffProjectTeamDeadlinesPageProps) {
  const { projectId, teamId } = await params;
  const ctx = await getStaffTeamContext(projectId, teamId);

  if (!ctx.ok) {
    return null;
  }

  const { team } = ctx;
  const numericProjectId = Number(projectId);
  const query = searchParams ? await searchParams : {};
  const initialStudentId = Number(query.studentId);

  const members = team.allocations.map((allocation) => ({
    id: allocation.user.id,
    firstName: allocation.user.firstName,
    lastName: allocation.user.lastName,
    email: allocation.user.email,
  }));

  return (
    <>
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
        <div className="staff-projects__team-policy-badges">
          <span className="staff-projects__badge">{members.length} student{members.length === 1 ? "" : "s"}</span>
          <span className="staff-projects__badge">
            {team.hasDeadlineOverride ? "Team override active" : "No team override"}
          </span>
        </div>
        <div className="staff-projects__team-policy-actions">
          <StaffTeamDeadlineProfileControl
            teamId={team.id}
            initialProfile={team.deadlineProfile === "MCF" ? "MCF" : "STANDARD"}
          />
        </div>
      </section>

      <StaffStudentDeadlineOverridesPanel
        projectId={numericProjectId}
        members={members}
        initialStudentId={Number.isInteger(initialStudentId) && initialStudentId > 0 ? initialStudentId : null}
      />
    </>
  );
}
