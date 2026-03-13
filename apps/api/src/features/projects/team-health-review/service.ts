import {
  canStaffAccessTeamInProject,
  type DeadlineInputMode,
  getTeamDeadlineDetailsInProject,
  getTeamCurrentDeadlineInProject,
  hasAnotherResolvedTeamHealthMessage,
  resolveTeamHealthMessageWithDeadlineOverride,
  reviewTeamHealthMessage,
} from "../repo.js";

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

  return reviewTeamHealthMessage(projectId, teamId, requestId, userId, resolved, responseText);
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
