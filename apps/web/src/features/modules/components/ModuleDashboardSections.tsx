import Link from "next/link";
import type { ModuleTimelineItem } from "../moduleDashboardData";
import { formatLongDate } from "../moduleDashboardData";
import { ArrowRightIcon } from "@/shared/ui/ArrowRightIcon";
import { Card } from "@/shared/ui/Card";
import { Table } from "@/shared/ui/Table";

type ModuleProjectPlan = {
  name: string;
  startAt: Date;
  endAt: Date;
  weight: number;
};

type ModuleLinkedProject = {
  id: string;
  name: string;
  moduleName?: string;
};

type ModuleTabNavProps = {
  moduleId: string;
  activeTab: "expectations" | "marks";
};

type ModuleSummaryCardProps = {
  title: string;
  moduleCode: string;
  teamCount: number;
  projectCount: number;
  hasLinkedProjects: boolean;
  projectPlans: ModuleProjectPlan[];
};

type ModuleExpectationsSectionProps = {
  moduleTitle: string;
  briefParagraphs: string[];
  projectPlans: ModuleProjectPlan[];
  linkedProjects: ModuleLinkedProject[];
  timelineRows: ModuleTimelineItem[];
  expectationRows: Array<[string, string, string]>;
  readinessParagraphs: string[];
};

type ModuleMarksSectionProps = {
  marksRows: Array<[string, string, string]>;
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
  moduleCode,
  teamCount,
  projectCount,
  hasLinkedProjects,
  projectPlans,
}: ModuleSummaryCardProps) {
  return (
    <Card title={<span className="overview-title">{title}</span>} className="module-dashboard__panel module-dashboard__panel--summary">
      <p className="muted">
        {moduleCode} • {teamCount} team{teamCount === 1 ? "" : "s"} •{" "}
        {hasLinkedProjects
          ? `${projectCount} linked project${projectCount === 1 ? "" : "s"}`
          : `${projectPlans.length} planned project${projectPlans.length === 1 ? "" : "s"}`}
      </p>
    </Card>
  );
}

export function ModuleExpectationsSection(props: ModuleExpectationsSectionProps) {
  return (
    <>
      <ModuleBriefCard briefParagraphs={props.briefParagraphs} projectPlans={props.projectPlans} />
      <ModuleLinkedProjectsCard moduleTitle={props.moduleTitle} linkedProjects={props.linkedProjects} />
      <ModuleTimelineCard timelineRows={props.timelineRows} />
      <ModuleExpectationsCard expectationRows={props.expectationRows} />
      <ModuleReadinessCard readinessParagraphs={props.readinessParagraphs} />
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

function ModuleLinkedProjectsCard({
  moduleTitle,
  linkedProjects,
}: {
  moduleTitle: string;
  linkedProjects: ModuleLinkedProject[];
}) {
  return (
    <Card title="Projects in this module" className="module-dashboard__panel module-dashboard__panel--projects">
      {linkedProjects.length > 0 ? (
        <div className="module-dashboard__linked-projects">
          {linkedProjects.map((project) => (
            <article key={`linked-project-${project.id}`} className="module-dashboard__linked-project-card">
              <h4 className="module-dashboard__linked-project-title">{project.name}</h4>
              <p className="module-dashboard__linked-project-module">Module: {project.moduleName ?? moduleTitle}</p>
              <div className="module-dashboard__linked-project-footer">
                <Link href={`/projects/${encodeURIComponent(project.id)}`} className="module-dashboard__linked-project-link">
                  View project <ArrowRightIcon />
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="muted">No projects assigned to you in this module yet.</p>
      )}
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

export function ModuleMarksSection({ marksRows }: ModuleMarksSectionProps) {
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
