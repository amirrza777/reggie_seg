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
  StaffModuleSummaryInResponse,
} from "./types.js";
import { buildPerformanceSummary } from "./service.performanceSummary.js";

async function getModuleIfLead(staffId: number, moduleId: number) {
  return repo.getModuleDetailsIfAuthorised(moduleId, staffId);
}

function mapModuleForStaffResponse(module: {
  id: number;
  name: string;
  archivedAt: Date | null;
}): StaffModuleSummaryInResponse {
  return {
    id: module.id,
    title: module.name,
    archivedAt: module.archivedAt?.toISOString() ?? null,
  };
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
    module: mapModuleForStaffResponse(module),
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
  const [{ members, assessments }, teamMarking, assessmentDueDate] = await Promise.all([
    repo.getTeamWithAssessments(teamId),
    repo.findTeamMarking(teamId),
    repo.findAssessmentDueDateForTeam(teamId),
  ]);
  members.sort((a, b) => a.lastName.localeCompare(b.lastName));
  const expected = Math.max(0, members.length - 1); // each student reviews (n-1) peers
  const deadlinePassed = assessmentDueDate != null && assessmentDueDate < new Date();
  const students: ModuleSummary[] = members.map((user) => {
    const submitted = assessments.filter((a) => a.reviewerUserId === user.id).length;
    const title = `${user.firstName} ${user.lastName}`.trim() || `Student ${user.id}`;
    const flagged = deadlinePassed && submitted < expected;
    return { ...buildProgressSummary(user.id, title, submitted, expected), flagged };
  });
  return {
    module: mapModuleForStaffResponse(module),
    team: { id: team.id, title: team.teamName },
    students,
    teamMarking: mapMarkingRecord(teamMarking),
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
    module: mapModuleForStaffResponse(module),
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
  if (module.archivedAt != null) {
    throw { code: "MODULE_ARCHIVED" as const };
  }

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
  if (module.archivedAt != null) {
    throw { code: "MODULE_ARCHIVED" as const };
  }

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
