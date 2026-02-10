import * as repo from "./repo.js";
import { findTeamByIdAndModule, getTeamWithAssessments } from "./repo.js";
import type {
  ModuleSummary,
  ModuleDetailsResponse,
  TeamDetailsResponse,
  StudentDetailsResponse,
  QuestionAverage,
  ReviewerAnswer,
  PerformanceSummary,
} from "./types.js";

async function getModuleIfLead(staffId: number, moduleId: number) {
  return repo.getModuleDetailsIfAuthorised(moduleId, staffId);
}

function buildProgressSummary(
  id: number,
  title: string,
  submitted: number,
  expected: number
): ModuleSummary {
  return { id, title, submitted, expected };
}

export async function getProgressForModulesILead(staffId: number): Promise<ModuleSummary[]> {
  const modules = await repo.findModulesForStaff(staffId);
  return Promise.all(
    modules.map(async (module) => {
      const [submitted, all] = await Promise.all([
        repo.countSubmittedPAsForModule(module.id),
        repo.countStudentsInModule(module.id),
      ]);
      const expected = all * (all - 1);
      return buildProgressSummary(module.id, module.name, submitted, expected);
    })
  );
}

export async function getProgressForTeam(moduleId: number): Promise<ModuleSummary[]> {
  const teams = await repo.findTeamsInModule(moduleId);
  return Promise.all(
    teams.map(async (team) => {
      const [submitted, all] = await Promise.all([
        repo.countSubmittedPAsForTeam(team.id),
        repo.countStudentsInTeam(team.id),
      ]);
      const expected = all * (all - 1);
      return buildProgressSummary(team.id, team.teamName, submitted, expected);
    })
  );
}

export async function getModuleDetailsIfLead(
  staffId: number,
  moduleId: number
): Promise<ModuleDetailsResponse | null> {
  const module = await getModuleIfLead(staffId, moduleId);
  if (!module) return null;
  const teams = await getProgressForTeam(moduleId);
  return {
    module: { id: module.id, title: module.name },
    teams,
  };
}

export async function getTeamDetailsIfLead(
  staffId: number,
  moduleId: number,
  teamId: number
): Promise<TeamDetailsResponse | null> {
  const module = await getModuleIfLead(staffId, moduleId);
  if (!module) return null;
  const team = await repo.findTeamByIdAndModule(teamId, moduleId);
  if (!team) return null;
  const { members, assessments } = await repo.getTeamWithAssessments(teamId);
  members.sort((a, b) => a.lastName.localeCompare(b.lastName));
  const expected = Math.max(0, members.length - 1); // each student reviews (n-1) peers
  const students: ModuleSummary[] = members.map((user) => {
    const submitted = assessments.filter((a) => a.reviewerUserId === user.id).length;
    const title =
      `${user.firstName} ${user.lastName}`.trim() || `Student ${user.id}`;
    return buildProgressSummary(user.id, title, submitted, expected);
  });
  return {
    module: { id: module.id, title: module.name },
    team: { id: team.id, title: team.teamName },
    students,
  };
}

function parseScore(value: unknown): number | null {
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  if (typeof value === "string") {
    const n = parseFloat(value);
    return Number.isNaN(n) ? null : n;
  }
  return null;
}

function buildPerformanceSummary(
  assessments: Array<{
    id: number;
    reviewerUserId: number;
    answersJson: unknown;
    questionnaireTemplateId: number;
    reviewer: { id: number; firstName: string; lastName: string };
  }>,
  questions: Array<{ id: number; label: string; order: number }>
): PerformanceSummary {
  if (assessments.length === 0 || questions.length === 0) {
    return { overallAverage: 0, totalReviews: 0, questionAverages: [] };
  }
  const questionAverages: QuestionAverage[] = questions.map((q) => {
    const reviewerAnswers: ReviewerAnswer[] = [];
    let sum = 0;
    for (const a of assessments) {
      const json = a.answersJson as Record<string, unknown>;
      const score = parseScore(json[q.id] ?? json[String(q.id)]);
      if (score != null) {
        sum += score;
        reviewerAnswers.push({
          reviewerId: String(a.reviewerUserId),
          reviewerName: `${a.reviewer.firstName} ${a.reviewer.lastName}`.trim() || `Reviewer ${a.reviewerUserId}`,
          score,
          assessmentId: String(a.id),
        });
      }
    }
    const totalReviews = reviewerAnswers.length;
    const averageScore = totalReviews > 0 ? sum / totalReviews : 0;
    return {
      questionId: q.id,
      questionText: q.label,
      averageScore: Math.round(averageScore * 100) / 100,
      totalReviews,
      ...(reviewerAnswers.length > 0 ? { reviewerAnswers } : {}),
    };
  });
  const allScores = questionAverages.flatMap((q) =>
    (q.reviewerAnswers ?? []).map((r) => r.score)
  );
  const overallAverage =
    allScores.length > 0
      ? Math.round((allScores.reduce((a, b) => a + b, 0) / allScores.length) * 100) / 100
      : 0;
  return {
    overallAverage,
    totalReviews: assessments.length,
    questionAverages,
  };
}

export async function getStudentDetailsIfLead(
  staffId: number,
  moduleId: number,
  teamId: number,
  studentId: number
): Promise<StudentDetailsResponse | null> {
  const module = await getModuleIfLead(staffId, moduleId);
  if (!module) return null;
  const team = await findTeamByIdAndModule(teamId, moduleId);
  if (!team) return null;
  const { members, assessments } = await getTeamWithAssessments(teamId);
  const student = members.find((m) => m.id === studentId) ?? null;
  if (!student) return null;
  const reviewedByCurrentStudent = new Set(
    assessments.filter((a) => a.reviewerUserId === studentId).map((a) => a.revieweeUserId)
  );
  const reviewedCurrentStudent = new Set(
    assessments.filter((a) => a.revieweeUserId === studentId).map((a) => a.reviewerUserId)
  );
  const teamMembers = members
    .filter((u) => u.id !== studentId)
    .map((u) => ({
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      reviewedByCurrentStudent: reviewedByCurrentStudent.has(u.id),
      reviewedCurrentStudent: reviewedCurrentStudent.has(u.id),
    }));

  const reviewsReceived = await repo.findAssessmentsForRevieweeInTeam(teamId, studentId);
  let performanceSummary: PerformanceSummary;
  const firstReview = reviewsReceived[0];
  if (reviewsReceived.length === 0 || !firstReview) {
    performanceSummary = { overallAverage: 0, totalReviews: 0, questionAverages: [] };
  } else {
    const templateId = firstReview.questionnaireTemplateId;
    const template = await repo.findTemplateWithQuestions(templateId);
    performanceSummary = template
      ? buildPerformanceSummary(reviewsReceived, template.questions)
      : { overallAverage: 0, totalReviews: 0, questionAverages: [] };
  }

  return {
    module: { id: module.id, title: module.name },
    team: { id: team.id, title: team.teamName },
    student: {
      id: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
    },
    teamMembers,
    performanceSummary,
  };
}
