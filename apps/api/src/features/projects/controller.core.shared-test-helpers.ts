import { vi } from "vitest";
import type { Response } from "express";

vi.mock("./service.js", () => ({
  createProject: vi.fn(),
  fetchProjectById: vi.fn(),
  fetchProjectMarking: vi.fn(),
  fetchProjectTeamsForStaff: vi.fn(),
  fetchProjectsForUser: vi.fn(),
  fetchProjectsForStaff: vi.fn(),
  fetchProjectsWithTeamsForStaffMarking: vi.fn(),
  fetchModulesForUser: vi.fn(),
  fetchModuleStaffList: vi.fn(),
  fetchProjectDeadline: vi.fn(),
  fetchTeammatesForProject: vi.fn(),
  fetchTeamById: vi.fn(),
  fetchTeamByUserAndProject: vi.fn(),
  fetchQuestionsForProject: vi.fn(),
  fetchTeamAllocationQuestionnaireForProject: vi.fn(),
  fetchTeamAllocationQuestionnaireStatusForUser: vi.fn(),
  submitTeamAllocationQuestionnaireResponse: vi.fn(),
  fetchProjectNavFlagsConfigForStaff: vi.fn(),
  updateProjectNavFlagsConfigForStaff: vi.fn(),
  updateTeamDeadlineProfileForStaff: vi.fn(),
  fetchStaffStudentDeadlineOverrides: vi.fn(),
  upsertStaffStudentDeadlineOverride: vi.fn(),
  clearStaffStudentDeadlineOverride: vi.fn(),
}));

export function mockResponse() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}

export const deadlinePayload = {
  taskOpenDate: "2026-03-01T09:00:00.000Z",
  taskDueDate: "2026-03-08T17:00:00.000Z",
  taskDueDateMcf: "2026-03-15T17:00:00.000Z",
  assessmentOpenDate: "2026-03-09T09:00:00.000Z",
  assessmentDueDate: "2026-03-12T17:00:00.000Z",
  assessmentDueDateMcf: "2026-03-19T17:00:00.000Z",
  feedbackOpenDate: "2026-03-13T09:00:00.000Z",
  feedbackDueDate: "2026-03-16T17:00:00.000Z",
  feedbackDueDateMcf: "2026-03-23T17:00:00.000Z",
};
