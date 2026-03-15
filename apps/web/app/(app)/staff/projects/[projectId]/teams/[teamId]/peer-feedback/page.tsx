import Link from "next/link";
import { getStaffTeamContext } from "@/features/staff/projects/lib/staffTeamContext";
import { getTeamDetails } from "@/features/staff/peerAssessments/api/client";
import { getFeedbackReview, getPeerAssessmentsForUser } from "@/features/peerFeedback/api/client";
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
  const ctx = await getStaffTeamContext(projectId, teamId);

  if (!ctx.ok) return null;

  const { user, project, team } = ctx;

  let students: Awaited<ReturnType<typeof getTeamDetails>>["students"] = [];
  let feedbackRows: StudentFeedbackProgress[] = [];
  let feedbackError: string | null = null;
  try {
    const teamDetails = await getTeamDetails(user.id, project.moduleId, team.id);
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
    <>
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
                      href={`/staff/projects/${project.id}/teams/${team.id}/peer-feedback/${row.studentId}`}
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
    </>
  );
}
