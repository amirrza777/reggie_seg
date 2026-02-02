/* Staff can see a student's peer assessment progress for the rest of members in their team */

import { Placeholder } from "@/shared/ui/Placeholder";
import { Card } from "@/shared/ui/Card";

type PageProps = {
  params: Promise<{
    id: string;
    teamId: string;
    studentId: string;
  }>;
};

// TODO: replace with actual db call
const demoReviewStatus: Record<string, string[]> = {
  "1": ["2", "3", "4"],
  "2": ["1", "3"],
  "3": ["2"],
  "4": ["1"],
};

const demoStudentNames: Record<string, string> = {
  "1": "Amy",
  "2": "Ben",
  "3": "Cal",
  "4": "Dan",
};

const demoModuleTitles: Record<string, string> = {
  "mod-1": "ModuleA",
  "mod-2": "ModuleB",
  "mod-3": "ModuleC",
  "mod-4": "ModuleD",
};

const demoTeamTitles: Record<string, string> = {
  "team-1": "TeamA",
  "team-2": "TeamB",
  "team-3": "TeamC",
  "team-4": "TeamD",
};

const demoTeamMembers = ["1", "2", "3", "4"];

export default async function StudentPage({ params }: PageProps) {
  const { id: moduleId, teamId, studentId } = await params;

  const moduleTitle = demoModuleTitles[moduleId] ?? `Module ${moduleId}`;
  const teamTitle = demoTeamTitles[teamId] ?? `Team ${teamId}`;
  const studentName = demoStudentNames[studentId] ?? `Student ${studentId}`;

  const otherStudents = demoTeamMembers.filter((id) => id !== studentId);

  // Students this student has reviewed
  const reviewedIds = demoReviewStatus[studentId] ?? [];

  // Students who have reviewed this student (reverse lookup)
  const reviewedByIds = otherStudents.filter((otherId) => {
    const otherReviewedIds = demoReviewStatus[otherId] ?? [];
    return otherReviewedIds.includes(studentId);
  });

  return (
    <div className="stack">
      <Placeholder
        title={`${moduleTitle} - ${teamTitle} - ${studentName}`}
        path={`/admin/peerAssessments/module/${moduleId}/team/${teamId}/student/${studentId}`}
        description={`Detailed view of ${studentName}'s peer assessments for their team.`}
      />
      
      <div>
        <h2>Reviews Given</h2>
        <p className="muted">Team members {studentName} has reviewed</p>
        <div className="card-grid">
          {otherStudents.map((otherStudentId) => {
            const otherStudentName = demoStudentNames[otherStudentId] ?? `Student ${otherStudentId}`;
            const hasReviewed = reviewedIds.includes(otherStudentId);

            return (
              <Card key={otherStudentId} title={otherStudentName}>
                <div className="review-status">
                  {hasReviewed ? (
                    <>
                      <span>✓</span>
                      <span className="muted"> Reviewed</span>
                    </>
                  ) : (
                    <>
                      <span>✗</span>
                      <span className="muted"> Not reviewed</span>
                    </>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      <div>
        <h2>Reviews Received</h2>
        <p className="muted">Team members who have reviewed {studentName}</p>
        <div className="card-grid">
          {otherStudents.map((otherStudentId) => {
            const otherStudentName = demoStudentNames[otherStudentId] ?? `Student ${otherStudentId}`;
            const hasReviewedThisStudent = reviewedByIds.includes(otherStudentId);

            return (
              <Card key={otherStudentId} title={otherStudentName}>
                <div className="review-status">
                  {hasReviewedThisStudent ? (
                    <>
                      <span>✓</span>
                      <span className="muted"> Has reviewed</span>
                    </>
                  ) : (
                    <>
                      <span>✗</span>
                      <span className="muted"> Not reviewed</span>
                    </>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
