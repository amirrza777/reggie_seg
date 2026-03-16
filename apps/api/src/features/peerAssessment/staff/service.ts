import * as repo from "./repo.js";
import { findTeamByIdAndModule, getTeamWithAssessments } from "./repo.js";
import type {
  ModuleSummary,
  ModuleDetailsResponse,
  TeamDetailsResponse,
  StudentDetailsResponse,
  MarkingInput,
  StaffMarkingSummary,
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

function mapMarkingRecord(
  marking:
    | {
        mark: number | null;
        formativeFeedback: string | null;
        updatedAt: Date;
        marker: { id: number; firstName: string; lastName: string };
      }
    | null
): StaffMarkingSummary | null {
  if (!marking) return null;
  return {
    mark: marking.mark ?? null,
    formativeFeedback: marking.formativeFeedback ?? null,
    updatedAt: marking.updatedAt.toISOString(),
    marker: marking.marker,
  };
}

/** Returns the progress for modules i lead. */
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

/** Returns the progress for team. */
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

/** Returns the module details if lead. */
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

/** Returns the team details if lead. */
export async function getTeamDetailsIfLead(
  staffId: number,
  moduleId: number,
  teamId: number
): Promise<TeamDetailsResponse | null> {
  const module = await getModuleIfLead(staffId, moduleId);
  if (!module) return null;
  const team = await repo.findTeamByIdAndModule(teamId, moduleId);
  if (!team) return null;
  const [{ members, assessments }, teamMarking] = await Promise.all([
    repo.getTeamWithAssessments(teamId),
    repo.findTeamMarking(teamId),
  ]);
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
    teamMarking: mapMarkingRecord(teamMarking),
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

function parseScoreForQuestion(answersJson: unknown, questionId: number): number | null {
  if (Array.isArray(answersJson)) {
    const match = answersJson.find((item) => {
      if (!item || typeof item !== "object") return false;
      const row = item as Record<string, unknown>;
      const q = row.question ?? row.questionId ?? row.id;
      return String(q) === String(questionId);
    });
    if (!match || typeof match !== "object") return null;
    const answer = (match as Record<string, unknown>).answer;
    return parseScore(answer);
  }

  if (answersJson && typeof answersJson === "object") {
    const row = answersJson as Record<string, unknown>;
    return parseScore(row[questionId] ?? row[String(questionId)]);
  }

  return null;
}

function getConfiguredMaxScore(configs: unknown): number | null {
  if (!configs || typeof configs !== "object") return null;
  const row = configs as Record<string, unknown>;
  const max = row.max;
  return typeof max === "number" && Number.isFinite(max) && max > 0 ? max : null;
}

function buildPerformanceSummary(
  assessments: Array<{
    id: number;
    reviewerUserId: number;
    answersJson: unknown;
    templateId: number;
    reviewer: { id: number; firstName: string; lastName: string };
  }>,
  questions: Array<{ id: number; label: string; order: number; type: string; configs: unknown | null }>
): PerformanceSummary {
  const maxScore = questions.reduce((acc, q) => {
    const configured = getConfiguredMaxScore(q.configs);
    return Math.max(acc, configured ?? 5);
  }, 5);

  if (assessments.length === 0 || questions.length === 0) {
    return { overallAverage: 0, totalReviews: assessments.length, questionAverages: [], maxScore };
  }
  const questionAverages: QuestionAverage[] = questions
    .map((q) => {
      const questionMaxScore = getConfiguredMaxScore(q.configs) ?? 5;
      const reviewerAnswers: ReviewerAnswer[] = [];
      let sum = 0;
      for (const a of assessments) {
        const score = parseScoreForQuestion(a.answersJson, q.id);
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
      if (totalReviews === 0) {
        return null;
      }
      const averageScore = totalReviews > 0 ? sum / totalReviews : 0;
      return {
        questionId: q.id,
        questionText: q.label,
        averageScore: Math.round(averageScore * 100) / 100,
        totalReviews,
        maxScore: questionMaxScore,
        reviewerAnswers,
      };
    })
    .filter((question): question is QuestionAverage => question != null);
  const dynamicMaxScore = questionAverages.reduce((acc, q) => Math.max(acc, q.maxScore ?? 5), 5);
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
    maxScore: dynamicMaxScore || maxScore,
  };
}

/** Returns the student details if lead. */
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

  const [reviewsReceived, teamMarking, studentMarking] = await Promise.all([
    repo.findAssessmentsForRevieweeInTeam(teamId, studentId),
    repo.findTeamMarking(teamId),
    repo.findStudentMarking(teamId, studentId),
  ]);
  let performanceSummary: PerformanceSummary;
  const firstReview = reviewsReceived[0];
  if (reviewsReceived.length === 0 || !firstReview) {
    performanceSummary = { overallAverage: 0, totalReviews: 0, questionAverages: [] };
  } else {
    const templateId = firstReview.templateId;
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
    teamMarking: mapMarkingRecord(teamMarking),
    studentMarking: mapMarkingRecord(studentMarking),
  };
}

/** Saves the team marking if lead. */
export async function saveTeamMarkingIfLead(
  staffId: number,
  moduleId: number,
  teamId: number,
  marking: MarkingInput
): Promise<StaffMarkingSummary | null> {
  const module = await getModuleIfLead(staffId, moduleId);
  if (!module) return null;

  const team = await repo.findTeamByIdAndModule(teamId, moduleId);
  if (!team) return null;

  const saved = await repo.upsertTeamMarking({
    teamId,
    markerUserId: staffId,
    mark: marking.mark,
    formativeFeedback: marking.formativeFeedback,
  });
  return mapMarkingRecord(saved);
}

/** Saves the student marking if lead. */
export async function saveStudentMarkingIfLead(
  staffId: number,
  moduleId: number,
  teamId: number,
  studentId: number,
  marking: MarkingInput
): Promise<StaffMarkingSummary | null> {
  const module = await getModuleIfLead(staffId, moduleId);
  if (!module) return null;

  const team = await repo.findTeamByIdAndModule(teamId, moduleId);
  if (!team) return null;

  const studentInTeam = await repo.isStudentInTeam(teamId, studentId);
  if (!studentInTeam) return null;

  const saved = await repo.upsertStudentMarking({
    teamId,
    studentUserId: studentId,
    markerUserId: staffId,
    mark: marking.mark,
    formativeFeedback: marking.formativeFeedback,
  });
  return mapMarkingRecord(saved);
}