import { getStaffTeamContext } from "@/features/staff/projects/lib/staffTeamContext";
import {
  StaffPeerStudentAssessmentsPanel,
  type StaffPeerAssessmentGroup,
} from "@/features/staff/projects/components/StaffPeerStudentAssessmentsPanel";
import { getFeedbackReview } from "@/features/peerFeedback/api/client";
import {
  getPeerAssessmentsForUser,
  getPeerAssessmentsReceivedForUser,
  getQuestionsByProject,
} from "@/features/peerAssessment/api/client";
import type { PeerAssessment } from "@/features/peerAssessment/types";
import "@/features/staff/projects/styles/staff-projects.css";

type PageProps = {
  params: Promise<{ projectId: string; teamId: string; studentId: string }>;
};

function fullName(firstName: string, lastName: string) {
  return `${firstName} ${lastName}`.trim() || "Unknown student";
}

function serialiseSubmittedAt(value: string | Date) {
  if (typeof value === "string") return value;
  return value.toISOString();
}

function buildGivenGroups(assessments: PeerAssessment[]): StaffPeerAssessmentGroup[] {
  const map = new Map<number, StaffPeerAssessmentGroup>();
  for (const a of assessments) {
    const id = a.revieweeUserId;
    const name = `${a.firstName} ${a.lastName}`.trim() || `Student ${id}`;
    let g = map.get(id);
    if (!g) {
      g = { counterpartId: id, counterpartName: name, assessments: [] };
      map.set(id, g);
    }
    g.assessments.push({
      id: a.id,
      submittedAt: serialiseSubmittedAt(a.submittedAt as string),
      answers: a.answers ?? {},
    });
  }
  return Array.from(map.values());
}

function buildReceivedGroups(
  assessments: PeerAssessment[],
  feedbackById: Record<
    string,
    { reviewText: string | null; agreementsJson: Record<string, { selected: string; score: number }> | null }
  >
): StaffPeerAssessmentGroup[] {
  const map = new Map<number, StaffPeerAssessmentGroup>();
  for (const a of assessments) {
    const id = a.reviewerUserId;
    const name = `${a.firstName} ${a.lastName}`.trim() || `Student ${id}`;
    let g = map.get(id);
    if (!g) {
      g = { counterpartId: id, counterpartName: name, assessments: [] };
      map.set(id, g);
    }
    const fb = feedbackById[a.id];
    g.assessments.push({
      id: a.id,
      submittedAt: serialiseSubmittedAt(a.submittedAt as string),
      answers: a.answers ?? {},
      feedbackReview: {
        reviewText: fb?.reviewText ?? null,
        agreementsJson: fb?.agreementsJson ?? null,
      },
    });
  }
  return Array.from(map.values());
}

export default async function StaffPeerAssessmentStudentPage({ params }: PageProps) {
  const { projectId, teamId, studentId } = await params;
  const ctx = await getStaffTeamContext(projectId, teamId);

  if (!ctx.ok) {
    return null;
  }

  const { project, team } = ctx;
  const numericProjectId = Number(projectId);
  const numericStudentId = Number(studentId);

  if (Number.isNaN(numericProjectId) || Number.isNaN(numericStudentId)) {
    return (
      <section className="staff-projects__team-card">
        <p className="muted" style={{ margin: 0 }}>
          Invalid route parameters.
        </p>
      </section>
    );
  }

  const student =
    team.allocations.find((allocation) => allocation.userId === numericStudentId)?.user ?? null;
  const studentTitle =
    student != null ? fullName(student.firstName, student.lastName) : `Student ${studentId}`;

  let givenAssessments: PeerAssessment[] = [];
  let receivedAssessments: PeerAssessment[] = [];
  let loadError: string | null = null;

  try {
    const [given, received] = await Promise.all([
      getPeerAssessmentsForUser(numericStudentId, numericProjectId),
      getPeerAssessmentsReceivedForUser(numericStudentId, numericProjectId),
    ]);
    givenAssessments = given;
    receivedAssessments = received;
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Failed to load peer assessments.";
  }

  const questionLabelById: Record<string, string> = {};
  try {
    const questions = await getQuestionsByProject(projectId);
    for (const question of questions) {
      questionLabelById[String(question.id)] = question.text;
    }
  } catch {
    // keep raw ids as labels
  }

  const feedbackById: Record<
    string,
    { reviewText: string | null; agreementsJson: Record<string, { selected: string; score: number }> | null }
  > = {};

  try {
    await Promise.all(
      receivedAssessments.map(async (assessment) => {
        try {
          const review = await getFeedbackReview(String(assessment.id));
          feedbackById[String(assessment.id)] = {
            reviewText: review.reviewText ?? null,
            agreementsJson:
              (review.agreementsJson as Record<string, { selected: string; score: number }> | null) ?? null,
          };
        } catch {
          feedbackById[String(assessment.id)] = { reviewText: null, agreementsJson: null };
        }
      })
    );
  } catch {
    // feedback layer optional
  }

  const givenGroups = buildGivenGroups(givenAssessments);
  const receivedGroups = buildReceivedGroups(receivedAssessments, feedbackById);
  const expectedPeerReviews = Math.max(0, team.allocations.length - 1);

  const recordCount = givenAssessments.length + receivedAssessments.length;

  return (
    <>
      <p className="muted">
        {studentTitle}: {recordCount} assessment record{recordCount === 1 ? "" : "s"}; up to {expectedPeerReviews}{" "}
        peer review{expectedPeerReviews === 1 ? "" : "s"} per student
      </p>

      {loadError ? (
        <section className="staff-projects__team-card">
          <p className="muted" style={{ margin: 0 }}>
            {loadError}
          </p>
        </section>
      ) : (
        <StaffPeerStudentAssessmentsPanel
          questionLabels={questionLabelById}
          expectedPeerReviews={expectedPeerReviews}
          givenGroups={givenGroups}
          receivedGroups={receivedGroups}
          backHref={`/staff/projects/${project.id}/teams/${team.id}/peer-assessment`}
        />
      )}
    </>
  );
}
