/* Staff can see a student's peer assessment progress for the rest of members in their team */

import { Placeholder } from "@/shared/ui/Placeholder";
import { Card } from "@/shared/ui/Card";
import { PerformanceSummaryCard } from "@/shared/ui/PerformanceSummaryCard";
import { getStudentDetails } from "@/features/staff/peerAssessments/api/client";
import { StaffMarkingCard } from "@/features/staff/peerAssessments/components/StaffMarkingCard";
import { ApiError } from "@/shared/api/errors";
import { getCurrentUser } from "@/shared/auth/session";

type PageProps = {
  params: Promise<{
    id: string;
    teamId: string;
    studentId: string;
  }>;
};

async function getStaffIdFromSession() {
  const user = await getCurrentUser();
  if (!user || (!user.isStaff && !user.isAdmin)) {
    throw new ApiError("You don’t have permission to view staff peer assessments.", { status: 403 });
  }
  return user.id;
}

function memberName(m: { firstName: string; lastName: string }) {
  return `${m.firstName} ${m.lastName}`.trim() || "—";
}

function formatStableDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown time";

  return `${new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date)} UTC`;
}

export default async function StudentPage({ params }: PageProps) {
  const { id: moduleIdParam, teamId: teamIdParam, studentId: studentIdParam } =
    await params;
  const moduleId = Number.parseInt(moduleIdParam, 10);
  const teamId = Number.parseInt(teamIdParam, 10);
  const studentId = Number.parseInt(studentIdParam, 10);
  if (Number.isNaN(moduleId) || Number.isNaN(teamId) || Number.isNaN(studentId)) {
    return (
      <div className="stack">
        <p className="muted">Invalid student route. Please open the student from the team list.</p>
      </div>
    );
  }
  let staffId: number | null = null;

  let data: Awaited<ReturnType<typeof getStudentDetails>> | null = null;
  let errorMessage: string | null = null;

  try {
    staffId = await getStaffIdFromSession();
    data = await getStudentDetails(staffId, moduleId, teamId, studentId);
  } catch (error) {
    if (error instanceof ApiError && error.status === 403) {
      errorMessage = "You don’t have permission to view staff peer assessments.";
    } else if (error instanceof ApiError && error.status === 404) {
      errorMessage = "This student was not found in the selected team.";
    } else {
      errorMessage = "Something went wrong loading this student. Please try again.";
    }
  }

  if (!data || staffId == null) {
    return (
      <div className="stack ui-page">
        <p className="muted">{errorMessage}</p>
      </div>
    );
  }

  const studentName = memberName(data.student);
  return (
    <div className="stack ui-page">
      <Placeholder
        title={`${data.module.title} – ${data.team.title} – ${studentName}`}
        description={`Detailed view of ${studentName}'s peer assessments for their team.`}
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
                style={{ display: "flex", alignItems: "center", gap: 8 }}
              >
                {m.reviewedByCurrentStudent ? (
                  <span style={{ fontSize: "1.25rem", color: "var(--status-success)" }}>✓</span>
                ) : (
                  <span style={{ fontSize: "1.25rem", color: "var(--status-danger)" }}>✗</span>
                )}
                <span>{memberName(m)}</span>
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
                style={{ display: "flex", alignItems: "center", gap: 8 }}
              >
                {m.reviewedCurrentStudent ? (
                  <span style={{ fontSize: "1.25rem", color: "var(--status-success)" }}>✓</span>
                ) : (
                  <span style={{ fontSize: "1.25rem", color: "var(--status-danger)" }}>✗</span>
                )}
                <span>{memberName(m)}</span>
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
        {data.teamMarking ? (
          <div className="stack" style={{ gap: 8 }}>
            <p>
              <strong>Team mark:</strong>{" "}
              {data.teamMarking.mark == null ? "Not set" : data.teamMarking.mark}
            </p>
            <p className="muted">
              {data.teamMarking.formativeFeedback ?? "No team formative feedback yet."}
            </p>
            <p className="ui-note ui-note--muted">
              Updated by {memberName(data.teamMarking.marker)} on{" "}
              {formatStableDateTime(data.teamMarking.updatedAt)}
            </p>
          </div>
        ) : (
          <p className="muted">No team-level marking yet.</p>
        )}
      </Card>

      <StaffMarkingCard
        title="Student marking and formative feedback"
        description={`Set an individual mark and formative feedback for ${studentName}.`}
        staffId={staffId}
        moduleId={moduleId}
        teamId={teamId}
        studentId={studentId}
        initialMarking={data.studentMarking}
      />
    </div>
  );
}