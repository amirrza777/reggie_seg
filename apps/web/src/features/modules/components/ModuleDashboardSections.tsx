import Link from "next/link";
import type { ModuleTimelineItem } from "../moduleDashboardData";
import { formatLongDate } from "../moduleDashboardData";
import { Card } from "@/shared/ui/Card";
import { Table } from "@/shared/ui/Table";

type ModuleProjectPlan = {
  name: string;
  startAt: Date;
  endAt: Date;
  weight: number;
};

type ModuleTabNavProps = {
  moduleId: string;
  activeTab: "expectations" | "marks";
};

type ModuleSummaryCardProps = {
  title: string;
  moduleLeadNames?: string[];
  moduleCode: string;
  teamCount: number;
  projectCount: number;
  hasLinkedProjects: boolean;
  projectPlans?: ModuleProjectPlan[];
};

type ModuleExpectationsSectionProps = {
  briefParagraphs?: string[];
  projectPlans?: ModuleProjectPlan[];
  timelineRows?: ModuleTimelineItem[];
  expectationRows?: Array<[string, string, string]>;
  readinessParagraphs?: string[];
};

type ModuleMarksSectionProps = {
  marksRows?: Array<[string, string, string]>;
};

export function ModuleTabNav({ moduleId, activeTab }: ModuleTabNavProps) {
  return (
    <nav className="pill-nav" aria-label="Module sections">
      <Link
        href={`/modules/${encodeURIComponent(moduleId)}`}
        className={`pill-nav__link${activeTab === "expectations" ? " pill-nav__link--active" : ""}`}
        aria-current={activeTab === "expectations" ? "page" : undefined}
      >
        Expectations
      </Link>
      <Link
        href={`/modules/${encodeURIComponent(moduleId)}?tab=marks`}
        className={`pill-nav__link${activeTab === "marks" ? " pill-nav__link--active" : ""}`}
        aria-current={activeTab === "marks" ? "page" : undefined}
      >
        Marks
      </Link>
    </nav>
  );
}

export function ModuleSummaryCard({
  title,
  moduleLeadNames = [],
  moduleCode,
  teamCount,
  projectCount,
  hasLinkedProjects,
  projectPlans = [],
}: ModuleSummaryCardProps) {
  const leadLabel = moduleLeadNames.length > 0 ? moduleLeadNames.join(", ") : "Not assigned";

  return (
    <Card title={<span className="overview-title">{title}</span>} className="module-dashboard__panel module-dashboard__panel--summary">
      <p className="muted module-dashboard__module-lead">
        Module lead{moduleLeadNames.length === 1 ? "" : "s"}: {leadLabel}
      </p>
      <p className="muted module-dashboard__summary-meta">
        {moduleCode} • {teamCount} team{teamCount === 1 ? "" : "s"} •{" "}
        {hasLinkedProjects
          ? `${projectCount} linked project${projectCount === 1 ? "" : "s"}`
          : `${projectPlans.length} planned project${projectPlans.length === 1 ? "" : "s"}`}
      </p>
    </Card>
  );
}

export function ModuleExpectationsSection(props: ModuleExpectationsSectionProps) {
  const briefParagraphs = props.briefParagraphs ?? [];
  const projectPlans = props.projectPlans ?? [];
  const timelineRows = props.timelineRows ?? [];
  const expectationRows = props.expectationRows ?? [];
  const readinessParagraphs = props.readinessParagraphs ?? [];

  return (
    <>
      <ModuleBriefCard briefParagraphs={briefParagraphs} projectPlans={projectPlans} />
      <ModuleTimelineCard timelineRows={timelineRows} />
      <ModuleExpectationsCard expectationRows={expectationRows} />
      <ModuleReadinessCard readinessParagraphs={readinessParagraphs} />
    </>
  );
}

function ModuleBriefCard({ briefParagraphs, projectPlans }: { briefParagraphs: string[]; projectPlans: ModuleProjectPlan[] }) {
  return (
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
        <ModuleBriefFallback projectPlans={projectPlans} />
      )}
    </Card>
  );
}

function ModuleBriefFallback({ projectPlans }: { projectPlans: ModuleProjectPlan[] }) {
  return (
    <div className="module-dashboard__brief">
      <p className="muted">
        Project work in this module contributes 100.0% of the overall module mark and is split across {projectPlans.length} project
        {projectPlans.length === 1 ? "" : "s"}.
      </p>
      <ol className="module-dashboard__project-list">
        {projectPlans.map((plan) => (
          <li key={plan.name}>
            <strong>{plan.name}</strong> runs from {formatLongDate(plan.startAt)} to {formatLongDate(plan.endAt)} and contributes {" "}
            {plan.weight.toFixed(1)}% of the final module mark.
          </li>
        ))}
      </ol>
      <p className="muted">Use the timeline below to track module events and key assessment checkpoints.</p>
    </div>
  );
}

function ModuleTimelineCard({ timelineRows }: { timelineRows: ModuleTimelineItem[] }) {
  return (
    <Card title="Timeline" className="module-dashboard__panel module-dashboard__panel--timeline">
      <Table
        headers={["When?", "Date & time", "Details"]}
        rows={timelineRows.map((item) => [
          <span className={`module-dashboard__when module-dashboard__when--${item.whenTone}`}>{item.whenLabel}</span>,
          item.dateLabel,
          <TimelineDetails item={item} />,
        ])}
        className="module-dashboard__table module-dashboard__timeline-table"
        rowClassName="module-dashboard__table-row module-dashboard__timeline-row"
        columnTemplate="minmax(140px, 0.9fr) minmax(0, 1.2fr) minmax(0, 1.4fr)"
      />
    </Card>
  );
}

function TimelineDetails({ item }: { item: ModuleTimelineItem }) {
  return (
    <div className="ui-stack-xs">
      {item.projectName ? <span>{item.projectName}</span> : null}
      {item.activity ? <span className="muted">{item.activity}</span> : null}
      {!item.projectName && !item.activity ? <span className="muted">Module timeline checkpoint</span> : null}
    </div>
  );
}

function ModuleExpectationsCard({ expectationRows }: { expectationRows: Array<[string, string, string]> }) {
  return (
    <Card title="Module expectations" className="module-dashboard__panel">
      <Table
        headers={["Expectation", "Target", "Owner"]}
        rows={expectationRows}
        className="module-dashboard__table module-dashboard__expectations-table"
        rowClassName="module-dashboard__table-row module-dashboard__expectations-row"
      />
    </Card>
  );
}

function ModuleReadinessCard({ readinessParagraphs }: { readinessParagraphs: string[] }) {
  return (
    <Card title="Readiness notes" className="module-dashboard__panel">
      {readinessParagraphs.length > 0 ? (
        readinessParagraphs.map((paragraph, index) => (
          <p key={`readiness-${index}`} className="muted">
            {paragraph}
          </p>
        ))
      ) : (
        <p className="muted">Keep module expectations current each week so teams can align around submissions, minutes, and review cycles.</p>
      )}
    </Card>
  );
}

export function ModuleMarksSection({ marksRows = [] }: ModuleMarksSectionProps) {
  return (
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
        <p className="muted">Marks are scoped to this module. Use this tab for module-level grading visibility only.</p>
      </Card>
    </>
  );
}
