import {
  canStaffAccessTeamInProject,
  getTeamCurrentDeadlineInProject,
  resolveMcfRequestWithDeadlineOverride,
  reviewMcfRequest,
} from "../repo.js";

export type McfReviewStatus = "REJECTED" | "IN_REVIEW";

export type DeadlineOverrideInput = {
  taskOpenDate?: Date | null;
  taskDueDate?: Date | null;
  assessmentOpenDate?: Date | null;
  assessmentDueDate?: Date | null;
  feedbackOpenDate?: Date | null;
  feedbackDueDate?: Date | null;
};

export async function fetchTeamDeadlineForStaff(userId: number, projectId: number, teamId: number) {
  const canAccess = await canStaffAccessTeamInProject(userId, projectId, teamId);
  if (!canAccess) return null;

  return getTeamCurrentDeadlineInProject(projectId, teamId);
}

export async function reviewTeamMcfRequestForStaff(
  userId: number,
  projectId: number,
  teamId: number,
  requestId: number,
  status: McfReviewStatus
) {
  const canAccess = await canStaffAccessTeamInProject(userId, projectId, teamId);
  if (!canAccess) return null;

  return reviewMcfRequest(projectId, teamId, requestId, userId, status);
}

export async function resolveTeamMcfRequestWithDeadlineOverrideForStaff(
  userId: number,
  projectId: number,
  teamId: number,
  requestId: number,
  overrides: DeadlineOverrideInput
) {
  const canAccess = await canStaffAccessTeamInProject(userId, projectId, teamId);
  if (!canAccess) return null;

  const currentDeadline = await getTeamCurrentDeadlineInProject(projectId, teamId);
  if (!currentDeadline) return null;

  return resolveMcfRequestWithDeadlineOverride(projectId, teamId, requestId, userId, {
    taskOpenDate: overrides.taskOpenDate === undefined ? currentDeadline.taskOpenDate : overrides.taskOpenDate,
    taskDueDate: overrides.taskDueDate === undefined ? currentDeadline.taskDueDate : overrides.taskDueDate,
    assessmentOpenDate:
      overrides.assessmentOpenDate === undefined ? currentDeadline.assessmentOpenDate : overrides.assessmentOpenDate,
    assessmentDueDate:
      overrides.assessmentDueDate === undefined ? currentDeadline.assessmentDueDate : overrides.assessmentDueDate,
    feedbackOpenDate:
      overrides.feedbackOpenDate === undefined ? currentDeadline.feedbackOpenDate : overrides.feedbackOpenDate,
    feedbackDueDate: overrides.feedbackDueDate === undefined ? currentDeadline.feedbackDueDate : overrides.feedbackDueDate,
  });
}
