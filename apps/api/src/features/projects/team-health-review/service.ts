import {
  canStaffAccessTeamInProject,
  type DeadlineInputMode,
  getTeamById,
  getTeamDeadlineDetailsInProject,
  getTeamCurrentDeadlineInProject,
  hasAnotherResolvedTeamHealthMessage,
  resolveTeamHealthMessageWithDeadlineOverride,
  reviewTeamHealthMessage,
} from "../repo.js";
import { addNotification } from "../../notifications/service.js";

export type DeadlineOverrideInput = {
  taskOpenDate?: Date | null;
  taskDueDate?: Date | null;
  assessmentOpenDate?: Date | null;
  assessmentDueDate?: Date | null;
  feedbackOpenDate?: Date | null;
  feedbackDueDate?: Date | null;
};

export type DeadlineOverrideMetadataInput = {
  inputMode?: DeadlineInputMode;
  shiftDays?: Partial<
    Record<
      "taskOpenDate" | "taskDueDate" | "assessmentOpenDate" | "assessmentDueDate" | "feedbackOpenDate" | "feedbackDueDate",
      number
    >
  >;
};

const deadlineFields = [
  "taskOpenDate",
  "taskDueDate",
  "assessmentOpenDate",
  "assessmentDueDate",
  "feedbackOpenDate",
  "feedbackDueDate",
] as const;

type DeadlineField = (typeof deadlineFields)[number];
type DeadlineValues = Record<DeadlineField, Date | null>;

export class InvalidDeadlineOverrideError extends Error {
  constructor(field: DeadlineField) {
    super(`${field} cannot be earlier than the current deadline`);
    this.name = "InvalidDeadlineOverrideError";
  }
}

export class ResolvedTeamHealthMessageAlreadyExistsError extends Error {
  constructor() {
    super("A resolved team health message already exists for this team. Edit that request instead.");
    this.name = "ResolvedTeamHealthMessageAlreadyExistsError";
  }
}

async function notifyTeamStudentsAboutStaffResponse(
  projectId: number,
  teamId: number,
) {
  const team = await getTeamById(teamId);
  if (!team || team.projectId !== projectId) return;

  const studentIds = team.allocations
    .filter((allocation) => allocation.user.role === "STUDENT")
    .map((allocation) => allocation.userId);
  if (studentIds.length === 0) return;

  await Promise.all(
    studentIds.map((userId) =>
      addNotification({
        userId,
        type: "TEAM_HEALTH_SUBMITTED",
        message: "Staff has responded to a team health message",
        link: `/projects/${projectId}/team-health`,
      }),
    ),
  );
}

export async function fetchTeamDeadlineForStaff(userId: number, projectId: number, teamId: number) {
  const canAccess = await canStaffAccessTeamInProject(userId, projectId, teamId);
  if (!canAccess) return null;

  return getTeamDeadlineDetailsInProject(projectId, teamId);
}

export async function reviewTeamHealthMessageForStaff(
  userId: number,
  projectId: number,
  teamId: number,
  requestId: number,
  resolved: boolean,
  responseText?: string
) {
  const canAccess = await canStaffAccessTeamInProject(userId, projectId, teamId);
  if (!canAccess) return null;

  const message = await reviewTeamHealthMessage(projectId, teamId, requestId, userId, resolved, responseText);
  if (!message) return null;

  if (typeof message.responseText === "string" && message.responseText.trim().length > 0) {
    await notifyTeamStudentsAboutStaffResponse(projectId, teamId);
  }

  return message;
}

export async function resolveTeamHealthMessageWithDeadlineOverrideForStaff(
  userId: number,
  projectId: number,
  teamId: number,
  requestId: number,
  overrides: DeadlineOverrideInput,
  metadata?: DeadlineOverrideMetadataInput
) {
  const canAccess = await canStaffAccessTeamInProject(userId, projectId, teamId);
  if (!canAccess) return null;

  const currentDeadline = await getTeamCurrentDeadlineInProject(projectId, teamId);
  if (!currentDeadline) return null;

  const hasResolvedTeamHealthMessage = await hasAnotherResolvedTeamHealthMessage(projectId, teamId, requestId);
  if (hasResolvedTeamHealthMessage) {
    throw new ResolvedTeamHealthMessageAlreadyExistsError();
  }

  const resolvedOverrides: DeadlineValues = {
    taskOpenDate: overrides.taskOpenDate === undefined ? currentDeadline.taskOpenDate : overrides.taskOpenDate,
    taskDueDate: overrides.taskDueDate === undefined ? currentDeadline.taskDueDate : overrides.taskDueDate,
    assessmentOpenDate:
      overrides.assessmentOpenDate === undefined ? currentDeadline.assessmentOpenDate : overrides.assessmentOpenDate,
    assessmentDueDate:
      overrides.assessmentDueDate === undefined ? currentDeadline.assessmentDueDate : overrides.assessmentDueDate,
    feedbackOpenDate:
      overrides.feedbackOpenDate === undefined ? currentDeadline.feedbackOpenDate : overrides.feedbackOpenDate,
    feedbackDueDate: overrides.feedbackDueDate === undefined ? currentDeadline.feedbackDueDate : overrides.feedbackDueDate,
  };

  for (const field of deadlineFields) {
    const current = currentDeadline[field];
    const next = resolvedOverrides[field];
    if (current && next && next.getTime() < current.getTime()) {
      throw new InvalidDeadlineOverrideError(field);
    }
  }

  return resolveTeamHealthMessageWithDeadlineOverride(projectId, teamId, requestId, userId, resolvedOverrides, metadata);
}
