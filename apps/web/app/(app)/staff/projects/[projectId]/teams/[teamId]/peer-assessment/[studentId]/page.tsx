import { getStaffTeamContext } from "@/features/staff/projects/lib/staffTeamContext";
import {
  StaffPeerStudentAssessmentsPanel,
  type StaffPeerAssessmentGroup,
} from "@/features/staff/projects/components/StaffPeerStudentAssessmentsPanel";
import { getFeedbackReviewsForAssessments } from "@/features/peerFeedback/api/client";
import {
  getPeerAssessmentsForUser,
  getPeerAssessmentsReceivedForUser,
  getQuestionsByProject,
} from "@/features/peerAssessment/api/client";
import type { PeerAssessment } from "@/features/peerAssessment/types";
import "@/features/staff/projects/styles/staff-projects.css";

type PageProps = {
  params: Promise<{ projectId: string; teamId: string; studentId: string }>;
  searchParams: Promise<{ peerTab?: string | string[]; peerCounterpart?: string | string[] }>;
};

function parsePeerDrilldown(search: {
  peerTab?: string | string[];
  peerCounterpart?: string | string[];
}): { tab: "given" | "received"; counterpartId: number } | null {
  const tabRaw = Array.isArray(search.peerTab) ? search.peerTab[0] : search.peerTab;
  const idRaw = Array.isArray(search.peerCounterpart) ? search.peerCounterpart[0] : search.peerCounterpart;
  if (tabRaw == null || idRaw == null || idRaw === "") return null;
  const tab = tabRaw === "received" ? "received" : tabRaw === "given" ? "given" : null;
  const counterpartId = Number.parseInt(String(idRaw), 10);
  if (tab == null || !Number.isFinite(counterpartId)) return null;
  return { tab, counterpartId };
}

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

export default async function StaffPeerAssessmentStudentPage({ params, searchParams }: PageProps) {
  const { projectId, teamId, studentId } = await params;
  const sp = await searchParams;
  const initialPeerFocus = parsePeerDrilldown(sp);
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

  const currentTeamId = team.id;

  try {
    const [given, received] = await Promise.all([
      getPeerAssessmentsForUser(numericStudentId, numericProjectId),
      getPeerAssessmentsReceivedForUser(numericStudentId, numericProjectId),
    ]);
    const belongsToThisTeam = (a: PeerAssessment) =>
      typeof a.teamId !== "number" || a.teamId === currentTeamId;
    givenAssessments = given.filter(belongsToThisTeam);
    receivedAssessments = received.filter(belongsToThisTeam);
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

  let feedbackById: Record<
    string,
    { reviewText: string | null; agreementsJson: Record<string, { selected: string; score: number }> | null }
  > = {};

  try {
    feedbackById = (await getFeedbackReviewsForAssessments(
      receivedAssessments.map((a) => String(a.id)),
    )) as Record<
      string,
      { reviewText: string | null; agreementsJson: Record<string, { selected: string; score: number }> | null }
    >;
  } catch {
    // feedback layer optional
  }

  const givenGroups = buildGivenGroups(givenAssessments);
  const receivedGroups = buildReceivedGroups(receivedAssessments, feedbackById);
  const expectedPeerReviews = Math.max(0, team.allocations.length - 1);

  return (
    <>
      {loadError ? (
        <section className="staff-projects__team-card">
          <p className="muted" style={{ margin: 0 }}>
            {loadError}
          </p>
        </section>
      ) : (
        <StaffPeerStudentAssessmentsPanel
          focusStudentName={studentTitle}
          questionLabels={questionLabelById}
          expectedPeerReviews={expectedPeerReviews}
          givenGroups={givenGroups}
          receivedGroups={receivedGroups}
          initialPeerFocus={initialPeerFocus}
        />
      )}
    </>
  );
}
