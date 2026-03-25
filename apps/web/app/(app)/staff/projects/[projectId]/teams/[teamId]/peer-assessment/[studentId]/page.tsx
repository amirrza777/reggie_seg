import { redirect } from "next/navigation";
import { Card } from "@/shared/ui/Card";
import { getCurrentUser } from "@/shared/auth/session";
import { getStaffProjectTeams } from "@/features/staff/projects/server/getStaffProjectTeamsCached";
import {
  getStudentDetails,
} from "@/features/staff/peerAssessments/api/client";
import {
  getPeerAssessmentsForUser,
  getQuestionsByProject,
} from "@/features/peerAssessment/api/client";
import "@/features/staff/projects/styles/staff-projects.css";

type PageProps = {
  params: Promise<{ projectId: string; teamId: string; studentId: string }>;
};

function fullName(firstName: string, lastName: string) {
  return `${firstName} ${lastName}`.trim() || "Unknown student";
}

export default async function StaffPeerAssessmentStudentPage({ params }: PageProps) {
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

  let reviewerRows: Array<{ id: number; reviewedCurrentStudent: boolean }> = [];
  let reviewerStatsError: string | null = null;
  try {
    const studentDetails = await getStudentDetails(
      user.id,
      projectData.project.moduleId,
      numericTeamId,
      numericStudentId
    );
    reviewerRows = studentDetails.teamMembers.filter((member) => member.id !== numericStudentId);
  } catch (error) {
    reviewerStatsError =
      error instanceof Error ? error.message : "Failed to load received-assessment stats.";
  }

  const receivedCount = reviewerRows.reduce(
    (count, member) => count + (member.reviewedCurrentStudent ? 1 : 0),
    0
  );

  let assessmentLoadError: string | null = null;
  let assessments: Awaited<ReturnType<typeof getPeerAssessmentsForUser>> = [];
  try {
    assessments = await getPeerAssessmentsForUser(numericStudentId, numericProjectId);
  } catch (error) {
    assessmentLoadError = error instanceof Error ? error.message : "Failed to load student submissions.";
  }

  const questionLabelById = new Map<string, string>();
  try {
    const questions = await getQuestionsByProject(projectId);
    questions.forEach((question) => questionLabelById.set(String(question.id), question.text));
  } catch {
    // Keep raw question ids if question metadata cannot be loaded.
  }

  return (
    <div className="staff-projects">
      <section className="staff-projects__hero">
        <p className="staff-projects__eyebrow">Peer Assessment</p>
        <h1 className="staff-projects__title">{studentTitle}</h1>
        <p className="staff-projects__desc">
          View-only evidence of what this student submitted about teammates.
        </p>
        <div className="staff-projects__meta">
          <span className="staff-projects__badge">Project {projectData.project.id}</span>
          <span className="staff-projects__badge">Team {team.id}</span>
        </div>
      </section>

      <section className="staff-projects__grid" aria-label="Student peer assessment summary">
        <article className="staff-projects__card">
          <h3 className="staff-projects__card-title">Submitted assessments</h3>
          <p className="staff-projects__card-sub">{assessments.length}</p>
        </article>
        <article className="staff-projects__card">
          <h3 className="staff-projects__card-title">Received from teammates</h3>
          <p className="staff-projects__card-sub">
            {reviewerStatsError ? "Unavailable" : `${receivedCount}/${reviewerRows.length}`}
          </p>
        </article>
      </section>

      {reviewerStatsError ? (
        <section className="staff-projects__team-card">
          <p className="muted" style={{ margin: 0 }}>{reviewerStatsError}</p>
        </section>
      ) : null}

      {assessmentLoadError ? (
        <section className="staff-projects__team-card">
          <p className="muted" style={{ margin: 0 }}>{assessmentLoadError}</p>
        </section>
      ) : null}

      {!assessmentLoadError && assessments.length === 0 ? (
        <section className="staff-projects__team-card">
          <p className="muted" style={{ margin: 0 }}>
            This student has not submitted peer assessments yet.
          </p>
        </section>
      ) : null}

      {!assessmentLoadError && assessments.length > 0 ? (
        <section className="staff-projects__team-list" aria-label="Submitted peer assessments">
          {assessments.map((assessment) => {
            const answers = Object.entries(assessment.answers ?? {});
            const targetName =
              `${assessment.firstName ?? ""} ${assessment.lastName ?? ""}`.trim() ||
              `Student ${assessment.revieweeUserId}`;

            return (
              <Card
                key={assessment.id}
                title={`Submitted for ${targetName}`}
              >
                <p className="muted" style={{ margin: "0 0 12px 0" }}>
                  Submitted: {new Date(assessment.submittedAt).toLocaleString()}
                </p>
                {answers.length === 0 ? (
                  <p className="muted" style={{ margin: 0 }}>No answers stored for this submission.</p>
                ) : (
                  <ul className="stack" style={{ gap: 10, margin: 0, paddingLeft: 18 }}>
                    {answers.map(([questionId, answer]) => (
                      <li key={`${assessment.id}-${questionId}`}>
                        <strong>{questionLabelById.get(questionId) ?? questionId}:</strong>{" "}
                        {answer == null || String(answer).length === 0 ? "No response" : String(answer)}
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            );
          })}
        </section>
      ) : null}
    </div>
  );
}
