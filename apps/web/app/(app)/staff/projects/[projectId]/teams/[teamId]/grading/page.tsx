import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/shared/auth/session";
import { getStaffProjectTeams } from "@/features/projects/api/client";
import { getTeamDetails } from "@/features/staff/peerAssessments/api/client";
import { StaffMarkingCard } from "@/features/staff/peerAssessments/components/StaffMarkingCard";
import { StaffTeamSectionNav } from "@/features/staff/projects/components/StaffTeamSectionNav";
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
        <Link href={`/staff/projects/${projectId}`} className="pill-nav__link" style={{ width: "fit-content" }}>
          Back to project teams
        </Link>
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
      <section className="staff-projects__hero">
        <p className="staff-projects__eyebrow">Grading</p>
        <h1 className="staff-projects__title">{team.teamName}</h1>
        <p className="staff-projects__desc">
          Project: {projectData.project.name}. Team-level grading and links to student-level grading details.
        </p>
        <div className="staff-projects__meta">
          <span className="staff-projects__badge">Project {projectData.project.id}</span>
          <span className="staff-projects__badge">Team {team.id}</span>
          <Link href={`/staff/projects/${projectData.project.id}/teams/${team.id}`} className="staff-projects__badge">
            Back to team overview
          </Link>
        </div>
      </section>

      <StaffTeamSectionNav projectId={projectId} teamId={teamId} />

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

          <section className="staff-projects__team-list" aria-label="Student grading drill down">
            <article className="staff-projects__team-card">
              <h3 className="staff-projects__team-title" style={{ margin: 0 }}>Student grading detail</h3>
              <p className="staff-projects__team-count">
                Open any student to set or update individual marks and formative feedback.
              </p>
            </article>
            {students.map((student) => (
              <article key={student.id ?? student.title} className="staff-projects__team-card">
                <div className="staff-projects__team-top">
                  <h3 className="staff-projects__team-title">{student.title}</h3>
                </div>
                {student.id == null ? (
                  <p className="muted" style={{ margin: 0 }}>Student identifier unavailable.</p>
                ) : (
                  <Link
                    href={`/staff/peer-assessments/module/${projectData.project.moduleId}/team/${team.id}/student/${student.id}`}
                    className="pill-nav__link staff-projects__team-action"
                  >
                    Open student grading
                  </Link>
                )}
              </article>
            ))}
          </section>
        </>
      )}
    </div>
  );
}
