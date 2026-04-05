import { redirect } from "next/navigation";
import { getCurrentUser } from "@/shared/auth/session";
import { getStaffProjectTeams } from "@/features/staff/projects/server/getStaffProjectTeamsCached";
import {
  getFeedbackReview,
  getPeerAssessmentsForUser,
  getPeerAssessmentsReceivedForUser,
} from "@/features/peerFeedback/api/client";
import type { AgreementsMap, Answer } from "@/features/peerFeedback/types";
import { FeedbackEvidenceBrowser } from "./FeedbackEvidenceBrowser";
import "@/features/staff/projects/styles/staff-projects.css";

type PageProps = {
  params: Promise<{ projectId: string; teamId: string; studentId: string }>;
};

type FeedbackEvidenceRow = {
  id: string;
  counterpartName: string;
  submittedAt: string;
  answers: Answer[];
  reviewText: string | null;
  agreementsJson: AgreementsMap | null;
};

function fullName(firstName: string, lastName: string) {
  return `${firstName} ${lastName}`.trim() || "Unknown student";
}

function getScores(items: FeedbackEvidenceRow[]) {
  const scores: number[] = [];
  for (const item of items) {
    if (!item.agreementsJson) continue;
    for (const value of Object.values(item.agreementsJson)) {
      if (typeof value.score === "number" && Number.isFinite(value.score)) {
        scores.push(value.score);
      }
    }
  }
  return scores;
}

function toAverageLabel(scores: number[]) {
  if (scores.length === 0) return "—";
  const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  return `${average.toFixed(2)} / 5`;
}

async function toEvidenceRows(
  rows: Awaited<ReturnType<typeof getPeerAssessmentsForUser>>,
): Promise<FeedbackEvidenceRow[]> {
  const mapped = await Promise.all(
    rows.map(async (row) => {
      let reviewText: string | null = null;
      let agreementsJson: AgreementsMap | null = null;
      try {
        const review = await getFeedbackReview(String(row.id));
        reviewText = review.reviewText ?? null;
        agreementsJson = review.agreementsJson ?? null;
      } catch {
        reviewText = null;
        agreementsJson = null;
      }

      return {
        id: String(row.id),
        counterpartName: `${row.firstName ?? ""} ${row.lastName ?? ""}`.trim() || "Unknown teammate",
        submittedAt: row.submittedAt,
        answers: Array.isArray(row.answers) ? row.answers : [],
        reviewText,
        agreementsJson,
      } satisfies FeedbackEvidenceRow;
    }),
  );

  mapped.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  return mapped;
}

export default async function StaffPeerFeedbackStudentPage({ params }: PageProps) {
  const { projectId, teamId, studentId } = await params;

  const user = await getCurrentUser();
  if (!user?.isStaff && user?.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const numericProjectId = Number(projectId);
  const numericTeamId = Number(teamId);
  const numericStudentId = Number(studentId);
  if (
    Number.isNaN(numericProjectId) ||
    Number.isNaN(numericTeamId) ||
    Number.isNaN(numericStudentId)
  ) {
    return <p className="muted">Invalid route parameters.</p>;
  }

  let projectData: Awaited<ReturnType<typeof getStaffProjectTeams>> | null = null;
  try {
    projectData = await getStaffProjectTeams(user.id, numericProjectId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load project team data.";
    return <p className="muted">{message}</p>;
  }

  const team = projectData.teams.find((item) => item.id === numericTeamId) ?? null;
  if (!team) {
    return <p className="muted">Team not found in this project.</p>;
  }

  const student = team.allocations.find((allocation) => allocation.userId === numericStudentId)?.user ?? null;
  const studentTitle = student ? fullName(student.firstName, student.lastName) : `Student ${studentId}`;

  let givenRows: FeedbackEvidenceRow[] = [];
  let receivedRows: FeedbackEvidenceRow[] = [];
  let feedbackLoadError: string | null = null;

  try {
    const [given, received] = await Promise.all([
      getPeerAssessmentsForUser(String(numericStudentId), String(numericProjectId)),
      getPeerAssessmentsReceivedForUser(String(numericStudentId), String(numericProjectId)),
    ]);
    givenRows = await toEvidenceRows(given);
    receivedRows = await toEvidenceRows(received);
  } catch (error) {
    feedbackLoadError = error instanceof Error ? error.message : "Failed to load feedback evidence.";
  }

  const receivedRatingScores = getScores(givenRows);
  const averageRatingReceivedLabel = toAverageLabel(receivedRatingScores);

  return (
    <div className="staff-projects">
      <section className="staff-projects__hero">
        <p className="staff-projects__eyebrow">Peer Feedback</p>
        <h1 className="staff-projects__title">{studentTitle}</h1>
        <p className="staff-projects__desc">
          Inspect how teammates reviewed this student&apos;s assessments, and how this student reviewed assessments written about them.
        </p>
      </section>

      {feedbackLoadError ? (
        <section className="staff-projects__team-card">
          <p className="muted" style={{ margin: 0 }}>{feedbackLoadError}</p>
        </section>
      ) : (
        <div className="stack" style={{ gap: 16 }}>
          <FeedbackEvidenceBrowser
            title="Reviews on this user’s assessments given to teammates"
            subtitle="Question rows show teammate ratings. Expand a question to view the original answer text."
            items={givenRows}
            emptyMessage="No assessment reviews were found for assessments this student gave."
            headerAside={{ label: "Avg rating received", value: averageRatingReceivedLabel }}
          />
          <FeedbackEvidenceBrowser
            title="How this user reviewed assessments made on them"
            subtitle="Question rows show the ratings this student selected when reviewing assessments they received."
            items={receivedRows}
            emptyMessage="No completed feedback reviews were found for assessments this student received."
          />
        </div>
      )}
    </div>
  );
}
