/* Staff can see a student's peer assessment progress for the rest of members in their team */

import { Placeholder } from "@/shared/ui/Placeholder";
import { Card } from "@/shared/ui/Card";
import { PerformanceSummaryCard } from "@/shared/ui/PerformanceSummaryCard";

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

// TODO: replace with actual db call
const demoAverageScores: Record<string, {
  overallAverage: number;
  totalReviews: number;
  questionAverages: Array<{
    questionId: number;
    questionText: string;
    averageScore: number;
    totalReviews: number;
  }>;
}> = {
  "1": {
    overallAverage: 4.3,
    totalReviews: 3,
    questionAverages: [
      { questionId: 1, questionText: "Communication skills", averageScore: 4.3, totalReviews: 3 },
      { questionId: 2, questionText: "Team collaboration", averageScore: 4.3, totalReviews: 3 },
      { questionId: 3, questionText: "Problem-solving ability", averageScore: 4.3, totalReviews: 3 },
      { questionId: 4, questionText: "Reliability and punctuality", averageScore: 4.7, totalReviews: 3 },
      { questionId: 5, questionText: "Technical competence", averageScore: 4.3, totalReviews: 3 },
    ],
  },
  "2": {
    overallAverage: 4.2,
    totalReviews: 2,
    questionAverages: [
      { questionId: 1, questionText: "Communication skills", averageScore: 4.5, totalReviews: 2 },
      { questionId: 2, questionText: "Team collaboration", averageScore: 4.0, totalReviews: 2 },
      { questionId: 3, questionText: "Problem-solving ability", averageScore: 4.5, totalReviews: 2 },
      { questionId: 4, questionText: "Reliability and punctuality", averageScore: 4.0, totalReviews: 2 },
      { questionId: 5, questionText: "Technical competence", averageScore: 4.0, totalReviews: 2 },
    ],
  },
  "3": {
    overallAverage: 4.0,
    totalReviews: 1,
    questionAverages: [
      { questionId: 1, questionText: "Communication skills", averageScore: 4.0, totalReviews: 1 },
      { questionId: 2, questionText: "Team collaboration", averageScore: 4.0, totalReviews: 1 },
      { questionId: 3, questionText: "Problem-solving ability", averageScore: 4.0, totalReviews: 1 },
      { questionId: 4, questionText: "Reliability and punctuality", averageScore: 4.0, totalReviews: 1 },
      { questionId: 5, questionText: "Technical competence", averageScore: 4.0, totalReviews: 1 },
    ],
  },
  "4": {
    overallAverage: 4.1,
    totalReviews: 1,
    questionAverages: [
      { questionId: 1, questionText: "Communication skills", averageScore: 4.0, totalReviews: 1 },
      { questionId: 2, questionText: "Team collaboration", averageScore: 4.0, totalReviews: 1 },
      { questionId: 3, questionText: "Problem-solving ability", averageScore: 4.0, totalReviews: 1 },
      { questionId: 4, questionText: "Reliability and punctuality", averageScore: 4.0, totalReviews: 1 },
      { questionId: 5, questionText: "Technical competence", averageScore: 4.0, totalReviews: 1 },
    ],
  },
};

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

  // TODO: replace with actual db call
  const baseSummary = demoAverageScores[studentId] ?? {
    overallAverage: 0,
    totalReviews: 0,
    questionAverages: [],
  };

  // TODO: replace with actual db call - mock reviewer answers
  const mockReviewerAnswers: Record<string, Record<number, Array<{ reviewerId: string; reviewerName: string; score: number; assessmentId: string }>>> = {
    "1": {
      1: [
        { reviewerId: "2", reviewerName: "Ben", score: 4, assessmentId: "assess-1-2" },
        { reviewerId: "3", reviewerName: "Cal", score: 5, assessmentId: "assess-1-3" },
        { reviewerId: "4", reviewerName: "Dan", score: 4, assessmentId: "assess-1-4" },
      ],
      2: [
        { reviewerId: "2", reviewerName: "Ben", score: 5, assessmentId: "assess-1-2" },
        { reviewerId: "3", reviewerName: "Cal", score: 4, assessmentId: "assess-1-3" },
        { reviewerId: "4", reviewerName: "Dan", score: 4, assessmentId: "assess-1-4" },
      ],
      3: [
        { reviewerId: "2", reviewerName: "Ben", score: 4, assessmentId: "assess-1-2" },
        { reviewerId: "3", reviewerName: "Cal", score: 5, assessmentId: "assess-1-3" },
        { reviewerId: "4", reviewerName: "Dan", score: 4, assessmentId: "assess-1-4" },
      ],
      4: [
        { reviewerId: "2", reviewerName: "Ben", score: 5, assessmentId: "assess-1-2" },
        { reviewerId: "3", reviewerName: "Cal", score: 4, assessmentId: "assess-1-3" },
        { reviewerId: "4", reviewerName: "Dan", score: 5, assessmentId: "assess-1-4" },
      ],
      5: [
        { reviewerId: "2", reviewerName: "Ben", score: 4, assessmentId: "assess-1-2" },
        { reviewerId: "3", reviewerName: "Cal", score: 5, assessmentId: "assess-1-3" },
        { reviewerId: "4", reviewerName: "Dan", score: 4, assessmentId: "assess-1-4" },
      ],
    },
  };

  const performanceSummary = {
    ...baseSummary,
    moduleId,
    teamId,
    studentId,
    questionAverages: baseSummary.questionAverages.map((q) => ({
      ...q,
      reviewerAnswers: mockReviewerAnswers[studentId]?.[q.questionId] ?? [],
    })),
  };

  return (
    <div className="stack">
      <Placeholder
        title={`${moduleTitle} - ${teamTitle} - ${studentName}`}
        path={`/admin/peerAssessments/module/${moduleId}/team/${teamId}/student/${studentId}`}
        description={`Detailed view of ${studentName}'s peer assessments for their team.`}
      />
      
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
        
        <Card title="Reviews Given">
          <p className="muted" style={{ marginBottom: 12 }}>Team members {studentName} has reviewed</p>
          <div className="stack" style={{ gap: 8 }}>
            {otherStudents.map((otherStudentId) => {
              const otherStudentName = demoStudentNames[otherStudentId] ?? `Student ${otherStudentId}`;
              const hasReviewed = reviewedIds.includes(otherStudentId);

              return (
                <div key={otherStudentId} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {hasReviewed ? (
                    <span style={{ fontSize: "1.25rem", color: "#0f8a55" }}>✓</span>
                  ) : (
                    <span style={{ fontSize: "1.25rem", color: "#dc2626" }}>✗</span>
                  )}
                  <span>{otherStudentName}</span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card title="Reviews Received">
          <p className="muted" style={{ marginBottom: 12 }}>Team members who have reviewed {studentName}</p>
          <div className="stack" style={{ gap: 8 }}>
            {otherStudents.map((otherStudentId) => {
              const otherStudentName = demoStudentNames[otherStudentId] ?? `Student ${otherStudentId}`;
              const hasReviewedThisStudent = reviewedByIds.includes(otherStudentId);

              return (
                <div key={otherStudentId} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {hasReviewedThisStudent ? (
                    <span style={{ fontSize: "1.25rem", color: "#0f8a55" }}>✓</span>
                  ) : (
                    <span style={{ fontSize: "1.25rem", color: "#dc2626" }}>✗</span>
                  )}
                  <span>{otherStudentName}</span>
                </div>
              );
            })}
          </div>
        </Card>

      </div>
      <PerformanceSummaryCard 
        title={`${studentName}'s average scores`} 
        data={performanceSummary}
        />
    </div>
  );
}
