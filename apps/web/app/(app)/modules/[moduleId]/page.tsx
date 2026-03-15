import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/shared/auth/session";
import { listModules } from "@/features/modules/api/client";
import type { Module } from "@/features/modules/types";
import { Card } from "@/shared/ui/Card";
import { Table } from "@/shared/ui/Table";

type ModulePageProps = {
  params: Promise<{ moduleId: string }>;
  searchParams?: Promise<{ tab?: string }>;
};

type ModuleProjectPlan = {
  name: string;
  startAt: Date;
  endAt: Date;
  weight: number;
};

type ModuleTimelineItem = {
  whenLabel: string;
  whenTone: "past" | "soon" | "upcoming";
  dateLabel: string;
  projectName: string;
  activity: string;
  occursAt: Date;
};

export default async function ModulePage({ params, searchParams }: ModulePageProps) {
  const { moduleId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const activeTab = resolvedSearchParams?.tab === "marks" ? "marks" : "expectations";

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  let modules: Module[] = [];
  try {
    modules = await listModules(user.id);
  } catch {
    modules = [];
  }

  const module = modules.find((item) => String(item.id) === moduleId);
  if (!module) notFound();

  const moduleCode = toModuleCode(module.id);
  const teamCount = module.teamCount ?? 0;
  const projectCount = module.projectCount ?? 0;

  const marksRows = buildMarksRows(module);
  const projectPlans = buildProjectPlans(module);
  const timelineRows = parseTimelineRows(module.timelineText) ?? buildTimelineRows(projectPlans);
  const expectationRows = parseExpectationRows(module.expectationsText) ?? buildExpectationRows(module);
  const briefParagraphs = parseParagraphs(module.briefText);
  const readinessParagraphs = parseParagraphs(module.readinessNotesText);
  const hasLinkedProjects = projectCount > 0;

  return (
    <div className="stack stack--tabbed module-dashboard">
      <nav className="pill-nav" aria-label="Module sections">
        <Link
          href={`/modules/${encodeURIComponent(module.id)}`}
          className={`pill-nav__link${activeTab === "expectations" ? " pill-nav__link--active" : ""}`}
          aria-current={activeTab === "expectations" ? "page" : undefined}
        >
          Expectations
        </Link>
        <Link
          href={`/modules/${encodeURIComponent(module.id)}?tab=marks`}
          className={`pill-nav__link${activeTab === "marks" ? " pill-nav__link--active" : ""}`}
          aria-current={activeTab === "marks" ? "page" : undefined}
        >
          Marks
        </Link>
      </nav>

      <Card title={<span className="overview-title">{module.title}</span>} className="module-dashboard__panel module-dashboard__panel--summary">
        <p className="muted">
          {moduleCode} • {teamCount} team{teamCount === 1 ? "" : "s"} •{" "}
          {hasLinkedProjects
            ? `${projectCount} linked project${projectCount === 1 ? "" : "s"}`
            : `${projectPlans.length} planned project${projectPlans.length === 1 ? "" : "s"}`}
        </p>
      </Card>

      {activeTab === "expectations" ? (
        <>
          <Card title="Module brief" className="module-dashboard__panel">
            {briefParagraphs.length > 0 ? (
              <div className="module-dashboard__brief">
                {briefParagraphs.map((paragraph, index) => (
                  <p key={`brief-${index}`} className="muted">
                    {paragraph}
                  </p>
                ))}
              </div>
            ) : (
              <div className="module-dashboard__brief">
                <p className="muted">
                  Project work in this module contributes 100.0% of the overall module mark and is split across{" "}
                  {projectPlans.length} project{projectPlans.length === 1 ? "" : "s"}.
                </p>
                <ol className="module-dashboard__project-list">
                  {projectPlans.map((plan) => (
                    <li key={plan.name}>
                      <strong>{plan.name}</strong> runs from {formatLongDate(plan.startAt)} to {formatLongDate(plan.endAt)} and
                      contributes {plan.weight.toFixed(1)}% of the final module mark.
                    </li>
                  ))}
                </ol>
                <p className="muted">Use the timeline below to track module events and key assessment checkpoints.</p>
              </div>
            )}
          </Card>

          <Card title="Timeline" className="module-dashboard__panel module-dashboard__panel--timeline">
            <Table
              headers={["When?", "Date & time", "Details"]}
              rows={timelineRows.map((item) => [
                <span className={`module-dashboard__when module-dashboard__when--${item.whenTone}`}>
                  {item.whenLabel}
                </span>,
                item.dateLabel,
                <div className="ui-stack-xs">
                  {item.projectName ? <span>{item.projectName}</span> : null}
                  {item.activity ? <span className="muted">{item.activity}</span> : null}
                  {!item.projectName && !item.activity ? <span className="muted">Module timeline checkpoint</span> : null}
                </div>,
              ])}
              className="module-dashboard__table module-dashboard__timeline-table"
              rowClassName="module-dashboard__table-row module-dashboard__timeline-row"
              columnTemplate="minmax(140px, 0.9fr) minmax(0, 1.2fr) minmax(0, 1.4fr)"
            />
          </Card>

          <Card title="Module expectations" className="module-dashboard__panel">
            <Table
              headers={["Expectation", "Target", "Owner"]}
              rows={expectationRows}
              className="module-dashboard__table module-dashboard__expectations-table"
              rowClassName="module-dashboard__table-row module-dashboard__expectations-row"
            />
          </Card>
          <Card title="Readiness notes" className="module-dashboard__panel">
            {readinessParagraphs.length > 0 ? (
              readinessParagraphs.map((paragraph, index) => (
                <p key={`readiness-${index}`} className="muted">
                  {paragraph}
                </p>
              ))
            ) : (
              <p className="muted">
                Keep module expectations current each week so teams can align around submissions, minutes, and review
                cycles.
              </p>
            )}
          </Card>
        </>
      ) : (
        <>
          <Card title="Marks overview" className="module-dashboard__panel">
            <Table
              headers={["Assessment", "Latest mark", "Status"]}
              rows={marksRows}
              className="module-dashboard__table module-dashboard__marks-table"
              rowClassName="module-dashboard__table-row module-dashboard__marks-row"
            />
          </Card>
          <Card title="Marking notes" className="module-dashboard__panel">
            <p className="muted">
              Marks are scoped to this module. Use this tab for module-level grading visibility only.
            </p>
          </Card>
        </>
      )}
    </div>
  );
}

function toModuleCode(moduleId: string): string {
  const numeric = Number(moduleId);
  if (Number.isFinite(numeric)) return `MOD-${numeric}`;
  return moduleId;
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

function buildExpectationRows(module: Module): Array<[string, string, string]> {
  const teamCount = module.teamCount ?? 0;
  const projectCount = module.projectCount ?? 0;

  return [
    ["Peer assessment submissions", "Fri 5 PM", "Module lead"],
    ["Meeting minutes published", "Today 6 PM", "Team leads"],
    [
      "Team allocation review",
      projectCount > 0 ? "Weekly" : "Set up first project",
      teamCount > 0 ? "Enterprise admin" : "Module lead",
    ],
  ];
}

function buildMarksRows(module: Module): Array<[string, string, string]> {
  const seed = Array.from(String(module.id)).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const base = 64 + (seed % 12);
  const scores = [base, base - 4, base + 3].map((value) => `${Math.max(0, Math.min(100, value))}%`);

  return [
    ["Sprint review", scores[0], "Recorded"],
    ["Technical checkpoint", scores[1], "Recorded"],
    ["Portfolio milestone", scores[2], "In progress"],
  ];
}

function buildProjectPlans(module: Module): ModuleProjectPlan[] {
  const seed = Array.from(String(module.id)).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const requestedCount = module.projectCount ?? 1;
  const projectCount = Math.max(1, Math.min(5, requestedCount));
  const weights = buildWeightedDistribution(projectCount);
  const anchor = buildAcademicAnchor(seed);
  const names = buildProjectNames(module.title, projectCount);

  return Array.from({ length: projectCount }, (_, idx) => {
    const startAt = addDays(anchor, idx * 63);
    const endAt = addDays(startAt, 42 + ((seed + idx * 9) % 21));
    endAt.setUTCHours(16, 0, 0, 0);
    return {
      name: names[idx],
      startAt,
      endAt,
      weight: weights[idx],
    };
  });
}

function buildTimelineRows(projectPlans: ModuleProjectPlan[]): ModuleTimelineItem[] {
  const now = new Date();
  const items: ModuleTimelineItem[] = [];

  for (const [idx, plan] of projectPlans.entries()) {
    const startAt = new Date(plan.startAt);
    startAt.setUTCHours(9, 0, 0, 0);
    items.push(buildTimelineItem(startAt, plan.name, "Project start", now));

    if (idx === 0) {
      const teamSetup = addDays(startAt, 7);
      teamSetup.setUTCHours(16, 0, 0, 0);
      items.push(buildTimelineItem(teamSetup, plan.name, "Team setup checkpoint", now));
    }

    const assessmentDeadline = new Date(plan.endAt);
    assessmentDeadline.setUTCHours(16, 0, 0, 0);
    items.push(buildTimelineItem(assessmentDeadline, plan.name, "Complete peer assessments", now));

    const responseDeadline = addDays(assessmentDeadline, 21);
    responseDeadline.setUTCHours(16, 0, 0, 0);
    items.push(buildTimelineItem(responseDeadline, plan.name, "Respond to peer assessments", now));
  }

  return items.sort((a, b) => a.occursAt.getTime() - b.occursAt.getTime());
}

function buildTimelineItem(occursAt: Date, projectName: string, activity: string, now: Date): ModuleTimelineItem {
  return {
    whenLabel: formatRelativeLabel(occursAt, now),
    whenTone: getTimelineTone(occursAt, now),
    dateLabel: formatTimelineDate(occursAt),
    projectName,
    activity,
    occursAt,
  };
}

function buildProjectNames(moduleTitle: string, projectCount: number): string[] {
  const normalized = moduleTitle.trim() || "Module";
  if (projectCount === 1) return [`${normalized} capstone`];

  const labels = ["Foundation sprint", "Applied build", "Major delivery", "Quality review", "Capstone wrap-up"];
  return Array.from({ length: projectCount }, (_, idx) => `${labels[idx] ?? `Project ${idx + 1}`} (${normalized})`);
}

function buildAcademicAnchor(seed: number): Date {
  const now = new Date();
  const anchorYear = now.getUTCMonth() >= 7 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
  const anchor = new Date(Date.UTC(anchorYear, 8, 8 + (seed % 14), 9, 0, 0, 0));

  if (anchor.getTime() > now.getTime()) {
    anchor.setUTCFullYear(anchor.getUTCFullYear() - 1);
  }

  return anchor;
}

function buildWeightedDistribution(count: number): number[] {
  if (count === 1) return [100];

  const raw = Array.from({ length: count }, (_, idx) => idx + 1);
  const total = raw.reduce((sum, value) => sum + value, 0);
  const weighted = raw.map((value) => Number(((value / total) * 100).toFixed(1)));
  const used = weighted.reduce((sum, value) => sum + value, 0);
  const diff = Number((100 - used).toFixed(1));

  weighted[count - 1] = Number((weighted[count - 1] + diff).toFixed(1));
  return weighted;
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

function formatLongDate(value: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
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

function addDays(base: Date, days: number): Date {
  const next = new Date(base.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}
