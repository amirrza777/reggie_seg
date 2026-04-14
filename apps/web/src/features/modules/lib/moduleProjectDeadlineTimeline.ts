import type { ModuleTimelineItem } from "../moduleDashboardData";
import type { ProjectDeadline } from "@/features/projects/types";

export type ModuleProjectDeadlineTimelineInput = {
  projectName: string;
  deadline: ProjectDeadline | null;
};

const DEADLINE_ACTIVITY_FIELDS: Array<{ key: keyof ProjectDeadline; activity: string }> = [
  { key: "teamAllocationQuestionnaireOpenDate", activity: "Team allocation questionnaire opens" },
  { key: "teamAllocationQuestionnaireDueDate", activity: "Team allocation questionnaire due" },
  { key: "taskOpenDate", activity: "Task opens" },
  { key: "taskDueDate", activity: "Task due" },
  { key: "assessmentOpenDate", activity: "Peer assessment opens" },
  { key: "assessmentDueDate", activity: "Peer assessment due" },
  { key: "feedbackOpenDate", activity: "Peer feedback opens" },
  { key: "feedbackDueDate", activity: "Peer feedback due" },
];

function parseIsoDate(value: string | null | undefined): Date | null {
  if (!value) {return null;}
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {return null;}
  return new Date(parsed);
}

function formatTimelineDate(value: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }).format(value);
}

function formatRelativeLabel(target: Date, now: Date): string {
  const dayMs = 24 * 60 * 60 * 1000;
  const diffMs = target.getTime() - now.getTime();
  const inPast = diffMs < 0;
  const dayCount = Math.max(1, Math.round(Math.abs(diffMs) / dayMs));

  if (dayCount < 45) {
    return `${dayCount} day${dayCount === 1 ? "" : "s"} ${inPast ? "ago" : "from now"}`;
  }

  if (dayCount < 320) {
    const months = Math.max(1, Math.round(dayCount / 30));
    return `about ${months} month${months === 1 ? "" : "s"} ${inPast ? "ago" : "from now"}`;
  }

  const years = Math.max(1, Math.round(dayCount / 365));
  return `about ${years} year${years === 1 ? "" : "s"} ${inPast ? "ago" : "from now"}`;
}

function getTimelineTone(target: Date, now: Date): "past" | "soon" | "upcoming" {
  const diffMs = target.getTime() - now.getTime();
  if (diffMs < 0) {return "past";}
  if (diffMs <= 14 * 24 * 60 * 60 * 1000) {return "soon";}
  return "upcoming";
}

export function buildModuleProjectDeadlineTimelineRows(
  projectDeadlines: ModuleProjectDeadlineTimelineInput[],
): ModuleTimelineItem[] {
  const now = new Date();
  const rows: ModuleTimelineItem[] = [];

  for (const project of projectDeadlines) {
    if (!project.deadline) {continue;}

    for (const field of DEADLINE_ACTIVITY_FIELDS) {
      const occursAt = parseIsoDate(project.deadline[field.key] as string | null | undefined);
      if (!occursAt) {continue;}

      rows.push({
        whenLabel: formatRelativeLabel(occursAt, now),
        whenTone: getTimelineTone(occursAt, now),
        dateLabel: formatTimelineDate(occursAt),
        projectName: project.projectName,
        activity: field.activity,
        occursAt,
      });
    }
  }

  return rows.sort((a, b) => {
    const timeDiff = a.occursAt.getTime() - b.occursAt.getTime();
    if (timeDiff !== 0) {return timeDiff;}
    const projectDiff = a.projectName.localeCompare(b.projectName);
    if (projectDiff !== 0) {return projectDiff;}
    return a.activity.localeCompare(b.activity);
  });
}
