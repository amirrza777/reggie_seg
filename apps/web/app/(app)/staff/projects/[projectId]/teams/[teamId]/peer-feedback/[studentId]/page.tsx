import { redirect } from "next/navigation";
import { Card } from "@/shared/ui/Card";
import { getCurrentUser } from "@/shared/auth/session";
import { getStaffProjectTeams } from "@/features/staff/projects/server/getStaffProjectTeamsCached";
import {
  getFeedbackReview,
  getPeerAssessmentsForUser,
} from "@/features/peerFeedback/api/client";
import "@/features/staff/projects/styles/staff-projects.css";

type PageProps = {
  params: Promise<{ projectId: string; teamId: string; studentId: string }>;
};

function fullName(firstName: string, lastName: string) {
  return `${firstName} ${lastName}`.trim() || "Unknown student";
}

type FeedbackEvidenceRow = {
  id: string;
  counterpartName: string;
  submittedAt: string;
  answers: Array<{ id: string; question: string; answer: string | number | boolean | null }>;
  reviewText: string | null;
  agreementsJson: Record<string, { selected: string; score: number }> | null;
};

type QuestionBreakdown = {
  key: string;
  label: string;
  ratingCount: number;
  averageScore: number | null;
  distribution: Array<{ label: string; count: number }>;
  entries: Array<{
    rowId: string;
    counterpartName: string;
    submittedAt: string;
    selected: string;
    score: number;
    reviewText: string | null;
  }>;
};

function buildQuestionBreakdowns(rows: FeedbackEvidenceRow[]): QuestionBreakdown[] {
  const map = new Map<
    string,
    {
      key: string;
      label: string;
      ratingCount: number;
      scoreTotal: number;
      distribution: Map<string, number>;
      entries: QuestionBreakdown["entries"];
    }
  >();

  for (const row of rows) {
    if (!row.agreementsJson) continue;

    for (const [answerId, value] of Object.entries(row.agreementsJson)) {
      const answerMeta = row.answers.find((answer) => answer.id === answerId);
      const label = answerMeta?.question ?? `Question ${answerId}`;
      const key = String(answerId);
      const score = Number.isFinite(value.score) ? value.score : 0;

      const current =
        map.get(key) ??
        {
          key,
          label,
          ratingCount: 0,
          scoreTotal: 0,
          distribution: new Map<string, number>(),
          entries: [],
        };

      current.ratingCount += 1;
      current.scoreTotal += score;
      current.distribution.set(value.selected, (current.distribution.get(value.selected) ?? 0) + 1);
      current.entries.push({
        rowId: row.id,
        counterpartName: row.counterpartName,
        submittedAt: row.submittedAt,
        selected: value.selected,
        score,
        reviewText: row.reviewText,
      });

      map.set(key, current);
    }
  }

  return Array.from(map.values())
    .map((item) => ({
      key: item.key,
      label: item.label,
      ratingCount: item.ratingCount,
      averageScore: item.ratingCount > 0 ? item.scoreTotal / item.ratingCount : null,
      distribution: Array.from(item.distribution.entries())
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count),
      entries: item.entries.sort(
        (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
      ),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
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
  const studentTitle =
    student != null ? fullName(student.firstName, student.lastName) : `Student ${studentId}`;

  let feedbackLoadError: string | null = null;
  const feedbackRows: FeedbackEvidenceRow[] = [];

  try {
    const feedbacks = await getPeerAssessmentsForUser(String(numericStudentId), projectId);
    const resolved = await Promise.all(
      feedbacks.map(async (feedback) => {
        let reviewText: string | null = null;
        let agreementsJson: Record<string, { selected: string; score: number }> | null = null;
        try {
          const review = await getFeedbackReview(String(feedback.id));
          reviewText = review.reviewText ?? null;
          agreementsJson = (review.agreementsJson as Record<string, { selected: string; score: number }> | null) ?? null;
        } catch {
          reviewText = null;
          agreementsJson = null;
        }

        return {
          id: String(feedback.id),
          counterpartName: `${feedback.firstName ?? ""} ${feedback.lastName ?? ""}`.trim() || "Unknown teammate",
          submittedAt: feedback.submittedAt,
          answers: feedback.answers ?? [],
          reviewText,
          agreementsJson,
        };
      })
    );

    resolved.sort(
      (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );
    feedbackRows.push(...resolved);
  } catch (error) {
    feedbackLoadError = error instanceof Error ? error.message : "Failed to load feedback evidence.";
  }

  const respondedCount = feedbackRows.reduce(
    (count, row) => count + (row.reviewText && row.reviewText.trim().length > 0 ? 1 : 0),
    0
  );
  const questionBreakdowns = buildQuestionBreakdowns(feedbackRows);
  const totalRatings = questionBreakdowns.reduce((sum, question) => sum + question.ratingCount, 0);
  const weightedScore = questionBreakdowns.reduce(
    (sum, question) => sum + (question.averageScore ?? 0) * question.ratingCount,
    0
  );
  const overallAverageScore = totalRatings > 0 ? weightedScore / totalRatings : null;

  return (
    <div className="staff-projects">
      <section className="staff-projects__hero">
        <p className="staff-projects__eyebrow">Peer Feedback</p>
        <h1 className="staff-projects__title">{studentTitle}</h1>
        <p className="staff-projects__desc">
          View-only evidence of feedback received by this student and their written responses.
        </p>
        <div className="staff-projects__meta">
          <span className="staff-projects__badge">Project {projectData.project.id}</span>
          <span className="staff-projects__badge">Team {team.id}</span>
        </div>
      </section>

      <section className="staff-projects__grid" aria-label="Student peer feedback summary">
        <article className="staff-projects__card">
          <h3 className="staff-projects__card-title">Feedback items</h3>
          <p className="staff-projects__card-sub">{feedbackRows.length}</p>
        </article>
        <article className="staff-projects__card">
          <h3 className="staff-projects__card-title">Responses written</h3>
          <p className="staff-projects__card-sub">{respondedCount}</p>
        </article>
        <article className="staff-projects__card">
          <h3 className="staff-projects__card-title">Questions rated</h3>
          <p className="staff-projects__card-sub">{questionBreakdowns.length}</p>
        </article>
        <article className="staff-projects__card">
          <h3 className="staff-projects__card-title">Average rating</h3>
          <p className="staff-projects__card-sub">
            {overallAverageScore == null ? "—" : `${overallAverageScore.toFixed(2)} / 5`}
          </p>
        </article>
      </section>

      {feedbackLoadError ? (
        <section className="staff-projects__team-card">
          <p className="muted" style={{ margin: 0 }}>{feedbackLoadError}</p>
        </section>
      ) : null}

      {!feedbackLoadError && feedbackRows.length === 0 ? (
        <section className="staff-projects__team-card">
          <p className="muted" style={{ margin: 0 }}>
            No peer-feedback evidence is available for this student yet.
          </p>
        </section>
      ) : null}

      {!feedbackLoadError && feedbackRows.length > 0 ? (
        <>
          <section className="staff-projects__team-list" aria-label="Question rating breakdown">
            <Card title="Feedback ratings by question">
              <p className="muted" style={{ margin: "0 0 12px" }}>
                Review how teammates rated this student on each question. Expand a rating row to read the related
                written feedback.
              </p>

              {questionBreakdowns.length === 0 ? (
                <p className="muted" style={{ margin: 0 }}>
                  No rating selections have been submitted yet.
                </p>
              ) : (
                <div className="stack" style={{ gap: 12 }}>
                  {questionBreakdowns.map((question) => (
                    <section key={`question-${question.key}`} className="staff-projects__team-card" style={{ margin: 0 }}>
                      <h4 style={{ margin: 0 }}>{question.label}</h4>
                      <p className="muted" style={{ margin: 0 }}>
                        {question.ratingCount} rating{question.ratingCount === 1 ? "" : "s"} • Avg{" "}
                        {question.averageScore == null ? "—" : `${question.averageScore.toFixed(2)} / 5`}
                      </p>
                      {question.distribution.length > 0 ? (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                          {question.distribution.map((item) => (
                            <span key={`${question.key}-${item.label}`} className="staff-projects__badge">
                              {item.label}: {item.count}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      <div className="stack" style={{ gap: 8 }}>
                        {question.entries.map((entry) => (
                          <details key={`${question.key}-${entry.rowId}-${entry.submittedAt}`}>
                            <summary style={{ cursor: "pointer" }}>
                              {entry.selected} ({entry.score}/5) • {entry.counterpartName}
                            </summary>
                            <p className="muted" style={{ margin: "8px 0 0" }}>
                              Submitted: {new Date(entry.submittedAt).toLocaleString()}
                            </p>
                            <p className="muted" style={{ margin: "6px 0 0" }}>
                              {entry.reviewText && entry.reviewText.trim().length > 0
                                ? entry.reviewText
                                : "No written response submitted for this rating."}
                            </p>
                          </details>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </Card>
          </section>

          <section className="staff-projects__team-list" aria-label="Peer feedback evidence">
            <Card title="Feedback summaries">
              {feedbackRows.filter((row) => row.reviewText && row.reviewText.trim().length > 0).length === 0 ? (
                <p className="muted" style={{ margin: 0 }}>
                  No written feedback responses have been submitted yet.
                </p>
              ) : (
                <div className="stack" style={{ gap: 10 }}>
                  {feedbackRows
                    .filter((row) => row.reviewText && row.reviewText.trim().length > 0)
                    .map((row) => (
                      <div key={`summary-${row.id}`} className="staff-projects__team-card" style={{ margin: 0 }}>
                        <p style={{ margin: 0, fontWeight: 600 }}>{row.counterpartName}</p>
                        <p className="muted" style={{ margin: 0 }}>
                          {new Date(row.submittedAt).toLocaleString()}
                        </p>
                        <p className="muted" style={{ margin: 0 }}>{row.reviewText}</p>
                      </div>
                    ))}
                </div>
              )}
            </Card>
          </section>
        </>
      ) : null}
    </div>
  );
}
