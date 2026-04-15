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

export function buildModuleDashboardData(
  module: Module,
  marksRows: Array<[string, string, string]> = [],
): ModuleDashboardData {
  const moduleCode = toModuleCode(module);
  const teamCount = module.teamCount ?? 0;
  const projectCount = module.projectCount ?? 0;
  const expectationRows = parseExpectationRows(module.expectationsText) ?? [];
  const briefParagraphs = parseParagraphs(module.briefText);
  const readinessParagraphs = parseParagraphs(module.readinessNotesText);

  return {
    moduleCode,
    teamCount,
    projectCount,
    hasLinkedProjects: projectCount > 0,
    marksRows,
    timelineRows: [],
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
