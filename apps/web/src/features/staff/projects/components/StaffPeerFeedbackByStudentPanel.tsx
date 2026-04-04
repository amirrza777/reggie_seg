import { getTeamDetails } from "@/features/staff/peerAssessments/api/client";
import { getFeedbackReview, getPeerAssessmentsForUser } from "@/features/peerFeedback/api/client";
import { StaffPeerMemberDualProgressGrid } from "./StaffPeerMemberDualProgressGrid";

type StudentFeedbackProgress = {
  studentId: number | null;
  studentName: string;
  assessments: number;
  reviewsCompleted: number;
  reviewsPending: number;
  error: string | null;
};

type StaffPeerFeedbackByStudentModel = {
  feedbackError: string | null;
  feedbackRows: StudentFeedbackProgress[];
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

export async function getStaffPeerFeedbackByStudentModel({
  userId,
  projectId,
  moduleId,
  teamId,
}: {
  userId: number;
  projectId: string;
  moduleId: number;
  teamId: number;
}): Promise<StaffPeerFeedbackByStudentModel> {
  let feedbackRows: StudentFeedbackProgress[] = [];
  let feedbackError: string | null = null;

  try {
    const teamDetails = await getTeamDetails(userId, moduleId, teamId);
    feedbackRows = await loadStudentFeedbackProgress(projectId, teamDetails.students);
  } catch (error) {
    feedbackError = error instanceof Error ? error.message : "Failed to load peer feedback progress.";
  }

  return { feedbackError, feedbackRows };
}

export function StaffPeerFeedbackByStudentPanel({ model }: { model: StaffPeerFeedbackByStudentModel }) {
  const { feedbackError, feedbackRows } = model;

  const gridItems = feedbackRows.map((row, index) => ({
    id: row.studentId ?? -(index + 1),
    title: row.studentName,
    deadline: "Deadline not set",
    givenSubmitted: row.reviewsCompleted,
    givenExpected: row.assessments,
    receivedSubmitted: row.reviewsPending,
    receivedExpected: row.assessments,
  }));

  return (
    <section className="staff-projects__team-card" aria-label="Peer feedback by student">
      <h3 style={{ margin: 0 }}>Peer feedback by student</h3>
      <p className="muted" style={{ margin: 0 }}>
        Track feedback responses each student has completed for teammates and which responses are still outstanding.
      </p>

      {feedbackError ? <p className="muted" style={{ marginTop: 8 }}>{feedbackError}</p> : null}

      {!feedbackError && feedbackRows.length === 0 ? (
        <p className="muted" style={{ marginTop: 8 }}>
          No student feedback data is available for this team yet.
        </p>
      ) : null}

      {!feedbackError && feedbackRows.some((row) => row.error) ? (
        <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
          {feedbackRows
            .filter((row) => row.error)
            .map((row) => (
              <p key={`feedback-row-error-${row.studentName}`} className="muted" style={{ margin: 0 }}>
                {row.studentName}: {row.error}
              </p>
            ))}
        </div>
      ) : null}

      {!feedbackError && feedbackRows.length > 0 ? (
        <StaffPeerMemberDualProgressGrid
          items={gridItems}
          eyebrowLabel="Peer feedback"
          firstMetricLabel="Feedback reviews completed"
          firstMetricUnit="completed"
          secondMetricLabel="Feedback reviews pending"
          secondMetricUnit="pending"
          disableLinks
        />
      ) : null}
    </section>
  );
}
