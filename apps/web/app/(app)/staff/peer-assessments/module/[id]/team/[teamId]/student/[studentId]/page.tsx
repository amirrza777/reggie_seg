/* Staff can see a student's peer assessment progress for the rest of members in their team */

import { Placeholder } from "@/shared/ui/Placeholder";
import { Card } from "@/shared/ui/Card";
import { PerformanceSummaryCard } from "@/shared/ui/PerformanceSummaryCard";
import { getStudentDetails } from "@/features/staff/peerAssessments/api/client";
import { ApiError } from "@/shared/api/errors";

type PageProps = {
  params: Promise<{
    id: string;
    teamId: string;
    studentId: string;
  }>;
};

// TODO: get staffId from authentication
async function getStaffId(): Promise<number> {
  return 1;
}

function memberName(m: { firstName: string; lastName: string }) {
  return `${m.firstName} ${m.lastName}`.trim() || "—";
}

export default async function StudentPage({ params }: PageProps) {
  const { id: moduleIdParam, teamId: teamIdParam, studentId: studentIdParam } =
    await params;
  const moduleId = parseInt(moduleIdParam);
  const teamId = parseInt(teamIdParam);
  const studentId = parseInt(studentIdParam);
  const staffId = await getStaffId();

  try {
    const data = await getStudentDetails(staffId, moduleId, teamId, studentId);

    const studentName = memberName(data.student);
    const path = `/staff/peer-assessments/module/${moduleIdParam}/team/${teamIdParam}/student/${studentIdParam}`;

    const performanceSummary = {
      ...data.performanceSummary,
      moduleId: moduleIdParam,
      teamId: teamIdParam,
      studentId: studentIdParam,
    };

    return (
      <div className="stack">
        <Placeholder
          title={`${data.module.title} – ${data.team.title} – ${studentName}`}
          path={path}
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
                    <span style={{ fontSize: "1.25rem", color: "#0f8a55" }}>
                      ✓
                    </span>
                  ) : (
                    <span style={{ fontSize: "1.25rem", color: "#dc2626" }}>
                      ✗
                    </span>
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
                    <span style={{ fontSize: "1.25rem", color: "#0f8a55" }}>
                      ✓
                    </span>
                  ) : (
                    <span style={{ fontSize: "1.25rem", color: "#dc2626" }}>
                      ✗
                    </span>
                  )}
                  <span>{memberName(m)}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <PerformanceSummaryCard
          title={`${studentName}'s average scores`}
          data={performanceSummary}
        />
      </div>
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 403) {
      return (
        <div className="stack">
          <p className="muted">
            You are not a module lead for this module, or the student was not
            found. You don&apos;t have permission to view this page.
          </p>
        </div>
      );
    }
    return (
      <div className="stack">
        <p className="muted">
          Something went wrong loading this student. Please try again.
        </p>
      </div>
    );
  }
}
