import { redirect } from "next/navigation";
import { getCurrentUser } from "@/shared/auth/session";
import { getStaffProjectTeams } from "@/features/staff/projects/server/getStaffProjectTeamsCached";
import { getTeamDetails } from "@/features/staff/peerAssessments/api/client";
import { StaffMarkingCard } from "@/features/staff/peerAssessments/components/StaffMarkingCard";
import { MarkingStudentList } from "./MarkingStudentList";
import "@/features/staff/projects/styles/staff-projects.css";

type PageProps = {
  params: Promise<{ projectId: string; teamId: string }>;
};

function formatStableDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown time";

  return `${new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date)} UTC`;
}

export default async function StaffTeamGradingSectionPage({ params }: PageProps) {
  const { projectId, teamId } = await params;

  const user = await getCurrentUser();
  if (!user?.isStaff && user?.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const numericProjectId = Number(projectId);
  const numericTeamId = Number(teamId);
  if (Number.isNaN(numericProjectId) || Number.isNaN(numericTeamId)) {
    return <p className="muted">Invalid project or team ID.</p>;
  }

  let projectData: Awaited<ReturnType<typeof getStaffProjectTeams>> | null = null;
  let projectError: string | null = null;
  try {
    projectData = await getStaffProjectTeams(user.id, numericProjectId);
  } catch (error) {
    projectError = error instanceof Error ? error.message : "Failed to load project team data.";
  }

  const team = projectData?.teams.find((item) => item.id === numericTeamId) ?? null;
  if (!projectData || !team) {
    return (
      <div className="stack">
        <p className="muted">{projectError ?? "Team not found in this project."}</p>
      </div>
    );
  }

  let teamMarking: Awaited<ReturnType<typeof getTeamDetails>>["teamMarking"] = null;
  let students: Awaited<ReturnType<typeof getTeamDetails>>["students"] = [];
  let gradingError: string | null = null;
  try {
    const teamDetails = await getTeamDetails(user.id, projectData.project.moduleId, numericTeamId);
    teamMarking = teamDetails.teamMarking;
    students = teamDetails.students;
  } catch (error) {
    gradingError = error instanceof Error ? error.message : "Failed to load grading data.";
  }

  const lastUpdatedLabel = teamMarking ? formatStableDateTime(teamMarking.updatedAt) : "Not graded yet";

  return (
    <div className="staff-projects">
      {gradingError ? (
        <section className="staff-projects__team-card">
          <p className="muted" style={{ margin: 0 }}>{gradingError}</p>
        </section>
      ) : (
        <>
          <section className="staff-projects__grid" aria-label="Grading summary">
            <article className="staff-projects__card">
              <h3 className="staff-projects__card-title">Team mark</h3>
              <p className="staff-projects__card-sub">{teamMarking?.mark == null ? "Not set" : teamMarking.mark}</p>
            </article>
            <article className="staff-projects__card">
              <h3 className="staff-projects__card-title">Students</h3>
              <p className="staff-projects__card-sub">{students.length}</p>
            </article>
            <article className="staff-projects__card">
              <h3 className="staff-projects__card-title">Last updated</h3>
              <p className="staff-projects__card-sub">{lastUpdatedLabel}</p>
            </article>
          </section>

          <StaffMarkingCard
            title="Team marking and formative feedback"
            description="Set a shared team mark and formative guidance visible to all team members."
            staffId={user.id}
            moduleId={projectData.project.moduleId}
            teamId={team.id}
            initialMarking={teamMarking}
          />

          <MarkingStudentList
            students={students}
            moduleId={projectData.project.moduleId}
            projectId={projectData.project.id}
            teamId={team.id}
          />
        </>
      )}
    </div>
  );
}
