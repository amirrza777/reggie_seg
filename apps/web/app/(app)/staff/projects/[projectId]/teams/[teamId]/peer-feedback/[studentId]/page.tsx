import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@/shared/ui/Card";
import { getCurrentUser } from "@/shared/auth/session";
import { getStaffProjectTeams } from "@/features/projects/api/client";
import {
  getFeedbackReview,
  getPeerAssessmentsForUser,
} from "@/features/peerFeedback/api/client";
import { StaffTeamSectionNav } from "@/features/staff/projects/components/StaffTeamSectionNav";
import "@/features/staff/projects/styles/staff-projects.css";

type PageProps = {
  params: Promise<{ projectId: string; teamId: string; studentId: string }>;
};

function fullName(firstName: string, lastName: string) {
  return `${firstName} ${lastName}`.trim() || "Unknown student";
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
  const feedbackRows: Array<{
    id: string;
    fromName: string;
    submittedAt: string;
    answers: Array<{ id: string; question: string; answer: string | number }>;
    reviewText: string | null;
    agreementsJson: Record<string, { selected: string; score: number }> | null;
  }> = [];

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
          fromName: `${feedback.firstName ?? ""} ${feedback.lastName ?? ""}`.trim() || "Unknown teammate",
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
          <Link
            href={`/staff/projects/${projectData.project.id}/teams/${team.id}/peer-feedback`}
            className="staff-projects__badge"
          >
            Back to peer feedback
          </Link>
        </div>
      </section>

      <StaffTeamSectionNav projectId={projectId} teamId={teamId} />

      <section className="staff-projects__grid" aria-label="Student peer feedback summary">
        <article className="staff-projects__card">
          <h3 className="staff-projects__card-title">Feedback items</h3>
          <p className="staff-projects__card-sub">{feedbackRows.length}</p>
        </article>
        <article className="staff-projects__card">
          <h3 className="staff-projects__card-title">Responses written</h3>
          <p className="staff-projects__card-sub">{respondedCount}</p>
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
        <section className="staff-projects__team-list" aria-label="Peer feedback evidence">
          {feedbackRows.map((row) => (
            <Card key={row.id} title={`From ${row.fromName}`}>
              <p className="muted" style={{ margin: "0 0 12px 0" }}>
                Submitted: {new Date(row.submittedAt).toLocaleString()}
              </p>

              <div className="stack" style={{ gap: 8 }}>
                <h4 style={{ margin: 0, fontSize: "1rem" }}>What was written about this student</h4>
                {row.answers.length === 0 ? (
                  <p className="muted" style={{ margin: 0 }}>No answer content stored.</p>
                ) : (
                  <ul className="stack" style={{ gap: 8, margin: 0, paddingLeft: 18 }}>
                    {row.answers.map((answer) => (
                      <li key={`${row.id}-${answer.id}`}>
                        <strong>{answer.question}:</strong>{" "}
                        {answer.answer == null || String(answer.answer).length === 0
                          ? "No response"
                          : String(answer.answer)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="stack" style={{ gap: 8, marginTop: 12 }}>
                <h4 style={{ margin: 0, fontSize: "1rem" }}>Student response</h4>
                <p className="muted" style={{ margin: 0 }}>
                  {row.reviewText && row.reviewText.trim().length > 0
                    ? row.reviewText
                    : "No written response submitted yet."}
                </p>
              </div>

              {row.agreementsJson && Object.keys(row.agreementsJson).length > 0 ? (
                <div className="stack" style={{ gap: 8, marginTop: 12 }}>
                  <h4 style={{ margin: 0, fontSize: "1rem" }}>Agreement selections</h4>
                  <ul className="stack" style={{ gap: 8, margin: 0, paddingLeft: 18 }}>
                    {Object.entries(row.agreementsJson).map(([answerId, value]) => (
                      <li key={`${row.id}-agreement-${answerId}`}>
                        Answer {answerId}: {value.score} - {value.selected}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </Card>
          ))}
        </section>
      ) : null}
    </div>
  );
}
