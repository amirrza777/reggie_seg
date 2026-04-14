import { vi } from "vitest";

export const apiFetchMock = vi.fn();

vi.mock("@/shared/api/http", () => ({
  apiFetch: (...args: unknown[]) => apiFetchMock(...args),
}));

export {
  clearStaffStudentDeadlineOverride,
  createStaffProject,
  createTeamHealthMessage,
  deleteStaffProjectManage,
  dismissTeamFlag,
  getMyTeamHealthMessages,
  getMyTeamWarnings,
  getProject,
  getProjectDeadline,
  getProjectMarking,
  getStaffProjectManage,
  getStaffProjectNavFlagsConfig,
  getStaffProjectPeerAssessmentOverview,
  getStaffProjectTeams,
  getStaffProjectWarningsConfig,
  getStaffProjects,
  getStaffProjectsForMarking,
  getStaffStudentDeadlineOverrides,
  getStaffTeamDeadline,
  getStaffTeamHealthMessages,
  getStaffTeamWarnings,
  getTeamAllocationQuestionnaireForProject,
  getTeamAllocationQuestionnaireStatusForProject,
  getTeamById,
  getTeamByUserAndProject,
  getTeammatesInProject,
  getUserProjects,
  patchStaffProjectManage,
  resolveStaffTeamHealthMessageWithDeadlineOverride,
  resolveStaffTeamWarning,
  reviewStaffTeamHealthMessage,
  submitTeamAllocationQuestionnaireResponse,
  updateStaffProjectNavFlagsConfig,
  updateStaffProjectWarningsConfig,
  updateStaffTeamDeadlineProfile,
  upsertStaffStudentDeadlineOverride,
} from "./client";
