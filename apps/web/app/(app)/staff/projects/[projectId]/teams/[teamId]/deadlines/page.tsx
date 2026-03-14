import Link from "next/link";
import { redirect } from "next/navigation";
import { getStaffProjectTeams } from "@/features/projects/api/client";
import { StaffTeamSectionNav } from "@/features/staff/projects/components/StaffTeamSectionNav";
import { StaffStudentDeadlineOverridesPanel } from "@/features/staff/projects/components/StaffStudentDeadlineOverridesPanel";
import { getCurrentUser } from "@/shared/auth/session";
import "@/features/staff/projects/styles/staff-projects.css";

type StaffProjectTeamDeadlinesPageProps = {
  params: Promise<{ projectId: string; teamId: string }>;
  searchParams?: Promise<{ studentId?: string }>;
};

export default async function StaffProjectTeamDeadlinesPage({ params, searchParams }: StaffProjectTeamDeadlinesPageProps) {
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
  const query = searchParams ? await searchParams : {};
  const initialStudentId = Number(query.studentId);

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

  const members = team.allocations.map((allocation) => ({
    id: allocation.user.id,
    firstName: allocation.user.firstName,
    lastName: allocation.user.lastName,
    email: allocation.user.email,
  }));

  return (
    <div className="staff-projects">
      <section className="staff-projects__hero">
        <p className="staff-projects__eyebrow">Deadlines</p>
        <h1 className="staff-projects__title">{team.teamName}</h1>
        <p className="staff-projects__desc">
          Configure manual per-student deadline adjustments for this team.
        </p>
        <div className="staff-projects__meta">
          <span className="staff-projects__badge">{members.length} student{members.length === 1 ? "" : "s"}</span>
          <Link href={`/staff/projects/${projectId}/teams/${teamId}`} className="staff-projects__badge">
            Back to overview
          </Link>
        </div>
      </section>

      <StaffTeamSectionNav projectId={projectId} teamId={teamId} />

      <StaffStudentDeadlineOverridesPanel
        projectId={numericProjectId}
        members={members}
        initialStudentId={Number.isInteger(initialStudentId) && initialStudentId > 0 ? initialStudentId : null}
      />
    </div>
  );
}
