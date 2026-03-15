import Link from "next/link";
import { getStaffTeamContext } from "@/features/staff/projects/lib/staffTeamContext";
import { getTeamDetails } from "@/features/staff/peerAssessments/api/client";
import { StaffMarkingCard } from "@/features/staff/peerAssessments/components/StaffMarkingCard";
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
  const ctx = await getStaffTeamContext(projectId, teamId);

  if (!ctx.ok) return null;

  const { user, project, team } = ctx;

  let teamMarking: Awaited<ReturnType<typeof getTeamDetails>>["teamMarking"] = null;
  let students: Awaited<ReturnType<typeof getTeamDetails>>["students"] = [];
  let gradingError: string | null = null;
  try {
    const teamDetails = await getTeamDetails(user.id, project.moduleId, team.id);
    teamMarking = teamDetails.teamMarking;
    students = teamDetails.students;
  } catch (error) {
    gradingError = error instanceof Error ? error.message : "Failed to load grading data.";
  }

  const lastUpdatedLabel = teamMarking ? formatStableDateTime(teamMarking.updatedAt) : "Not graded yet";

  return (
    <>
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
            moduleId={project.moduleId}
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
                    href={`/staff/projects/${project.id}/teams/${team.id}/peer-assessment/${student.id}`}
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
    </>
  );
}
