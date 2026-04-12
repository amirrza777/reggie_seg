/* Staff can see a student's peer assessment progress for the rest of members in their team */

import Link from "next/link";
import { Placeholder } from "@/shared/ui/Placeholder";
import { Card } from "@/shared/ui/Card";
import { PerformanceSummaryCard } from "@/shared/ui/PerformanceSummaryCard";
import { formatDateTime } from "@/shared/lib/dateFormatter";
import { getStudentDetails, getTeamDetails } from "@/features/staff/peerAssessments/api/client";
import { StaffMarkingCard } from "@/features/staff/peerAssessments/components/StaffMarkingCard";
import { getStaffTeamContext } from "@/features/staff/projects/lib/staffTeamContext";
import { ApiError } from "@/shared/api/errors";
import "@/features/staff/projects/styles/staff-projects.css";

type PageProps = {
  params: Promise<{
    projectId: string;
    teamId: string;
    studentId: string;
  }>;
};

function memberName(m: { firstName: string; lastName: string }) {
  return `${m.firstName} ${m.lastName}`.trim() || "—";
}

function formatMarkingUpdatedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Unknown time";
  const formatted = formatDateTime(iso);
  return formatted === "" ? "Unknown time" : formatted;
}

function peerReviewHref(
  projectId: string,
  teamId: string,
  subjectStudentId: number,
  tab: "given" | "received",
  counterpartId: number
) {
  const q = new URLSearchParams({
    peerTab: tab,
    peerCounterpart: String(counterpartId),
  });
  return `/staff/projects/${encodeURIComponent(projectId)}/teams/${encodeURIComponent(teamId)}/peer-assessment/${encodeURIComponent(String(subjectStudentId))}?${q}`;
}

export default async function StaffTeamGradingStudentPage({ params }: PageProps) {
  const { projectId, teamId, studentId: studentIdParam } = await params;
  const ctx = await getStaffTeamContext(projectId, teamId);

  if (!ctx.ok) {
    return null;
  }

  const studentId = Number.parseInt(studentIdParam, 10);
  if (Number.isNaN(studentId)) {
    return (
      <div className="stack ui-page">
        <p className="muted">Invalid student route. Please open the student from the team list.</p>
      </div>
    );
  }

  const { user, project, team } = ctx;
  const moduleId = project.moduleId;
  const numericTeamId = team.id;

  let data: Awaited<ReturnType<typeof getStudentDetails>> | null = null;
  let teamMarkingFallback: Awaited<ReturnType<typeof getTeamDetails>>["teamMarking"] = null;
  let errorMessage: string | null = null;

  try {
    const [studentRes, teamRes] = await Promise.allSettled([
      getStudentDetails(user.id, moduleId, numericTeamId, studentId),
      getTeamDetails(user.id, moduleId, numericTeamId),
    ]);

    if (studentRes.status === "rejected") {
      throw studentRes.reason;
    }
    data = studentRes.value;
    if (teamRes.status === "fulfilled") {
      teamMarkingFallback = teamRes.value.teamMarking;
    }
  } catch (error) {
    if (error instanceof ApiError && error.status === 403) {
      errorMessage = "You don’t have permission to view staff peer assessments.";
    } else if (error instanceof ApiError && error.status === 404) {
      errorMessage = "This student was not found in the selected team.";
    } else {
      errorMessage = "Something went wrong loading this student. Please try again.";
    }
  }

  if (!data) {
    return (
      <div className="stack ui-page">
        <p className="muted">{errorMessage}</p>
      </div>
    );
  }

  const studentName = memberName(data.student);
  const markingReadOnly = Boolean(project.moduleArchivedAt);
  const teamMarkingDisplay = data.teamMarking ?? teamMarkingFallback;

  return (
    <div className="stack ui-page staff-projects">
      <Placeholder
        title={`Grading ${studentName}`}
        description={`Summary view of ${studentName}'s work and marking panel for individual feedback and grading.`}
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: 16,
        }}
      >
        <Card title="Reviews Given">
          <p className="muted" style={{ marginBottom: 12 }}>
            Team members {studentName} has reviewed
          </p>
          <div className="stack" style={{ gap: 8 }}>
            {data.teamMembers.map((m) => (
              <div
                key={m.id}
                style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}
              >
                {m.reviewedByCurrentStudent ? (
                  <span style={{ fontSize: "1.25rem", color: "var(--status-success)" }}>✓</span>
                ) : (
                  <span style={{ fontSize: "1.25rem", color: "var(--status-danger)" }}>✗</span>
                )}
                <Link
                  href={peerReviewHref(projectId, teamId, studentId, "given", m.id)}
                  className="pill-nav__link staff-projects__team-action"
                  title={
                    m.reviewedByCurrentStudent
                      ? `View peer assessment given to ${memberName(m)}`
                      : `Open peer assessments for ${studentName} (not yet submitted for ${memberName(m)})`
                  }
                >
                  {memberName(m)}
                </Link>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Reviews Received">
          <p className="muted" style={{ marginBottom: 12 }}>
            Team members who have reviewed {studentName}
          </p>
          <div className="stack" style={{ gap: 8 }}>
            {data.teamMembers.map((m) => (
              <div
                key={m.id}
                style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}
              >
                {m.reviewedCurrentStudent ? (
                  <span style={{ fontSize: "1.25rem", color: "var(--status-success)" }}>✓</span>
                ) : (
                  <span style={{ fontSize: "1.25rem", color: "var(--status-danger)" }}>✗</span>
                )}
                <Link
                  href={peerReviewHref(projectId, teamId, studentId, "received", m.id)}
                  className="pill-nav__link staff-projects__team-action"
                  title={
                    m.reviewedCurrentStudent
                      ? `View peer assessment received from ${memberName(m)}`
                      : `Open peer assessments for ${studentName} (no submission from ${memberName(m)} yet)`
                  }
                >
                  {memberName(m)}
                </Link>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <PerformanceSummaryCard
        title={`${studentName}'s average scores`}
        data={data.performanceSummary}
      />

      <Card title="Current team-level marking">
        {teamMarkingDisplay ? (
          <div className="stack" style={{ gap: 8 }}>
            <p>
              <strong>Team mark:</strong>{" "}
              {teamMarkingDisplay.mark == null ? "Not set" : teamMarkingDisplay.mark}
            </p>
            <p className="muted">
              {teamMarkingDisplay.formativeFeedback ?? "No team formative feedback yet."}
            </p>
            <p className="ui-note ui-note--muted">
              Updated by {memberName(teamMarkingDisplay.marker)} on{" "}
              {formatMarkingUpdatedAt(teamMarkingDisplay.updatedAt)}
            </p>
          </div>
        ) : (
          <p className="muted">No team-level marking yet.</p>
        )}
      </Card>

      <StaffMarkingCard
        title="Student marking and formative feedback"
        description={`Set an individual mark and formative feedback for ${studentName}.`}
        staffId={user.id}
        moduleId={moduleId}
        teamId={numericTeamId}
        studentId={studentId}
        initialMarking={data.studentMarking}
        readOnly={markingReadOnly}
      />
    </div>
  );
}
