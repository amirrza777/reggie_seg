import type { Module } from "./types";

export type ModuleTimelineItem = {
  whenLabel: string;
  whenTone: "past" | "soon" | "upcoming";
  dateLabel: string;
  projectName: string;
  activity: string;
  occursAt: Date;
};

export type ModuleDashboardData = {
  moduleCode: string;
  teamCount: number;
  projectCount: number;
  hasLinkedProjects: boolean;
  marksRows: Array<[string, string, string]>;
  timelineRows: ModuleTimelineItem[];
  expectationRows: Array<[string, string, string]>;
  briefParagraphs: string[];
  readinessParagraphs: string[];
};

export function buildModuleDashboardData(module: Module): ModuleDashboardData {
  const moduleCode = toModuleCode(module);
  const teamCount = module.teamCount ?? 0;
  const projectCount = module.projectCount ?? 0;
  const timelineRows = parseTimelineRows(module.timelineText) ?? [];
  const expectationRows = parseExpectationRows(module.expectationsText) ?? [];
  const briefParagraphs = parseParagraphs(module.briefText);
  const readinessParagraphs = parseParagraphs(module.readinessNotesText);

  return {
    moduleCode,
    teamCount,
    projectCount,
    hasLinkedProjects: projectCount > 0,
    marksRows: [],
    timelineRows,
    expectationRows,
    briefParagraphs,
    readinessParagraphs,
  };
}

export function formatLongDate(value: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(value);
}

function toModuleCode(module: Module): string {
  if (module.code?.trim()) return module.code.trim();
  const numeric = Number(module.id);
  if (Number.isFinite(numeric)) return `MOD-${numeric}`;
  return module.id;
}

function parseParagraphs(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(/\n+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseExpectationRows(value: string | undefined): Array<[string, string, string]> | null {
  if (!value) return null;

  const rows = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [expectation = "", target = "", owner = ""] = line.split("|").map((entry) => entry.trim());
      return [expectation, target, owner] as [string, string, string];
    })
    .filter(([expectation]) => expectation.length > 0);

  return rows.length > 0 ? rows : null;
}

function parseTimelineRows(value: string | undefined): ModuleTimelineItem[] | null {
  if (!value) return null;

  const now = new Date();
  const rows = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [whenRaw = "", projectName = "", activity = ""] = line.split("|").map((entry) => entry.trim());
      const parsedTime = Date.parse(whenRaw);
      const hasValidTime = Number.isFinite(parsedTime);
      const occursAt = hasValidTime ? new Date(parsedTime) : now;

      return {
        whenLabel: hasValidTime ? formatRelativeLabel(occursAt, now) : "Scheduled",
        whenTone: hasValidTime ? getTimelineTone(occursAt, now) : "upcoming",
        dateLabel: hasValidTime ? formatTimelineDate(occursAt) : whenRaw,
        projectName,
        activity,
        occursAt,
      } satisfies ModuleTimelineItem;
    })
    .filter((item) => item.dateLabel.length > 0 || item.projectName.length > 0 || item.activity.length > 0);

  return rows.length > 0 ? rows : null;
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
  if (diffMs < 0) return "past";
  if (diffMs <= 14 * 24 * 60 * 60 * 1000) return "soon";
  return "upcoming";
}
