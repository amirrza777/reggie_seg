import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/shared/auth/session";
import { getStaffProjectTeams } from "@/features/projects/api/client";
import { getTeamDetails } from "@/features/staff/peerAssessments/api/client";
import { getFeedbackReview, getPeerAssessmentsForUser } from "@/features/peerFeedback/api/client";
import { StaffTeamSectionNav } from "@/features/staff/projects/components/StaffTeamSectionNav";
import "@/features/staff/projects/styles/staff-projects.css";

type PageProps = {
  params: Promise<{ projectId: string; teamId: string }>;
};

type StudentFeedbackProgress = {
  studentId: number | null;
  studentName: string;
  assessments: number;
  reviewsCompleted: number;
  reviewsPending: number;
  error: string | null;
};

async function loadStudentFeedbackProgress(
  projectId: string,
  students: Awaited<ReturnType<typeof getTeamDetails>>["students"]
): Promise<StudentFeedbackProgress[]> {
  const rows = await Promise.all(
    students.map(async (student) => {
      const studentId = student.id ?? null;
      const studentName = student.title;
      if (studentId == null) {
        return {
          studentId: null,
          studentName,
          assessments: 0,
          reviewsCompleted: 0,
          reviewsPending: 0,
          error: "Missing student id",
        };
      }

      try {
        const assessments = await getPeerAssessmentsForUser(String(studentId), projectId);
        const completedFlags: number[] = await Promise.all(
          assessments.map(async (assessment) => {
            try {
              await getFeedbackReview(String(assessment.id));
              return 1;
            } catch {
              return 0;
            }
          })
        );
        const reviewsCompleted = completedFlags.reduce((sum, value) => sum + value, 0);
        return {
          studentId,
          studentName,
          assessments: assessments.length,
          reviewsCompleted,
          reviewsPending: Math.max(0, assessments.length - reviewsCompleted),
          error: null,
        };
      } catch (error) {
        return {
          studentId,
          studentName,
          assessments: 0,
          reviewsCompleted: 0,
          reviewsPending: 0,
          error: error instanceof Error ? error.message : "Failed to load student feedback",
        };
      }
    })
  );

  return rows.sort((a, b) => a.studentName.localeCompare(b.studentName));
}

export default async function StaffPeerFeedbackSectionPage({ params }: PageProps) {
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

  let students: Awaited<ReturnType<typeof getTeamDetails>>["students"] = [];
  let feedbackRows: StudentFeedbackProgress[] = [];
  let feedbackError: string | null = null;
  try {
    const teamDetails = await getTeamDetails(user.id, projectData.project.moduleId, numericTeamId);
    students = teamDetails.students;
    feedbackRows = await loadStudentFeedbackProgress(projectId, students);
  } catch (error) {
    feedbackError = error instanceof Error ? error.message : "Failed to load peer feedback progress.";
  }

  const totals = feedbackRows.reduce(
    (acc, row) => {
      acc.assessments += row.assessments;
      acc.completed += row.reviewsCompleted;
      acc.pending += row.reviewsPending;
      return acc;
    },
    { assessments: 0, completed: 0, pending: 0 }
  );

  return (
    <div className="staff-projects">
      <section className="staff-projects__hero">
        <p className="staff-projects__eyebrow">Peer Feedback</p>
        <h1 className="staff-projects__title">{team.teamName}</h1>
        <p className="staff-projects__desc">
          Project: {projectData.project.name}. Feedback-review completion for this team.
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

      {feedbackError ? (
        <section className="staff-projects__team-card">
          <p className="muted" style={{ margin: 0 }}>{feedbackError}</p>
        </section>
      ) : (
        <>
          <section className="staff-projects__grid" aria-label="Peer feedback summary">
            <article className="staff-projects__card">
              <h3 className="staff-projects__card-title">Students</h3>
              <p className="staff-projects__card-sub">{students.length}</p>
            </article>
            <article className="staff-projects__card">
              <h3 className="staff-projects__card-title">Feedback tasks</h3>
              <p className="staff-projects__card-sub">{totals.assessments}</p>
            </article>
            <article className="staff-projects__card">
              <h3 className="staff-projects__card-title">Completed reviews</h3>
              <p className="staff-projects__card-sub">{totals.completed}</p>
            </article>
            <article className="staff-projects__card">
              <h3 className="staff-projects__card-title">Pending reviews</h3>
              <p className="staff-projects__card-sub">{totals.pending}</p>
            </article>
          </section>

          <section className="staff-projects__team-card">
            <p className="muted" style={{ margin: 0 }}>
              This section is view-only for feedback completion tracking. No grading actions are available here.
            </p>
          </section>

          <section className="staff-projects__team-list" aria-label="Peer feedback by student">
            {feedbackRows.length === 0 ? (
              <article className="staff-projects__team-card">
                <p className="muted" style={{ margin: 0 }}>
                  No student feedback data is available for this team yet.
                </p>
              </article>
            ) : (
              feedbackRows.map((row) => (
                <article key={`${row.studentId ?? row.studentName}`} className="staff-projects__team-card">
                  <div className="staff-projects__team-top">
                    <h3 className="staff-projects__team-title">{row.studentName}</h3>
                  </div>
                  {row.error ? <p className="muted" style={{ margin: 0 }}>{row.error}</p> : null}
                  <p className="staff-projects__team-count">
                    Assigned: {row.assessments} • Completed: {row.reviewsCompleted} • Pending: {row.reviewsPending}
                  </p>
                  {row.studentId != null ? (
                    <Link
                      href={`/staff/projects/${projectData.project.id}/teams/${team.id}/peer-feedback/${row.studentId}`}
                      className="pill-nav__link staff-projects__team-action"
                    >
                      Open feedback evidence
                    </Link>
                  ) : null}
                </article>
              ))
            )}
          </section>
        </>
      )}
    </div>
  );
}
