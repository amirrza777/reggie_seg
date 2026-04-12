import type { Project, ProjectDeadline, ProjectMarkingSummary } from "@/features/projects/types";

export type ProjectWorkflowState = "pending" | "active" | "completed_unmarked" | "completed_marked";

type ProjectWorkflowStateInput = {
  project: Pick<Project, "archivedAt" | "moduleArchivedAt"> | null | undefined;
  deadline?: Pick<ProjectDeadline, "taskOpenDate" | "taskDueDate" | "assessmentDueDate" | "feedbackDueDate"> | null;
  markValue?: number | null;
  now?: number | Date;
};

function parseTimestamp(value: string | null | undefined): number | null {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function resolveLatestDueTimestamp(
  deadline?: Pick<ProjectDeadline, "taskDueDate" | "assessmentDueDate" | "feedbackDueDate"> | null,
): number | null {
  if (!deadline) return null;

  const dueCandidates = [deadline.taskDueDate, deadline.assessmentDueDate, deadline.feedbackDueDate]
    .map((value) => parseTimestamp(value))
    .filter((value): value is number => value != null);

  if (dueCandidates.length === 0) return null;
  return Math.max(...dueCandidates);
}

export function resolveProjectMarkValue(marking: ProjectMarkingSummary | null | undefined): number | null {
  const studentMark = marking?.studentMarking?.mark;
  if (typeof studentMark === "number" && Number.isFinite(studentMark)) {
    return studentMark;
  }

  const teamMark = marking?.teamMarking?.mark;
  if (typeof teamMark === "number" && Number.isFinite(teamMark)) {
    return teamMark;
  }

  return null;
}

export function resolveProjectWorkflowState({
  project,
  deadline,
  markValue = null,
  now = Date.now(),
}: ProjectWorkflowStateInput): ProjectWorkflowState {
  const nowMs = now instanceof Date ? now.getTime() : now;
  const hasMark = typeof markValue === "number" && Number.isFinite(markValue);
  const latestDueMs = resolveLatestDueTimestamp(deadline);
  const hasArchivedScope = Boolean(project?.archivedAt || project?.moduleArchivedAt);
  const finishedByDueDate = latestDueMs != null && latestDueMs <= nowMs;

  if (hasArchivedScope || finishedByDueDate || hasMark) {
    return hasMark ? "completed_marked" : "completed_unmarked";
  }

  const taskOpenMs = parseTimestamp(deadline?.taskOpenDate);
  if (taskOpenMs != null && taskOpenMs > nowMs) {
    return "pending";
  }

  return "active";
}
