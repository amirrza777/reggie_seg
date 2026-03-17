import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { listModules } from "@/features/modules/api/client";
import { buildModuleDashboardData, formatLongDate, resolveModuleDashboardTab } from "@/features/modules/moduleDashboardData";
import type { Module } from "@/features/modules/types";
import { getCurrentUser } from "@/shared/auth/session";
import { Card } from "@/shared/ui/Card";
import { Table } from "@/shared/ui/Table";

type ModulePageProps = {
  params: Promise<{ moduleId: string }>;
  searchParams?: Promise<{ tab?: string }>;
};

export default async function ModulePage({ params, searchParams }: ModulePageProps) {
  const { moduleId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const activeTab = resolveModuleDashboardTab(resolvedSearchParams?.tab);

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

  const {
    moduleCode,
    teamCount,
    projectCount,
    hasLinkedProjects,
    marksRows,
    projectPlans,
    timelineRows,
    expectationRows,
    briefParagraphs,
    readinessParagraphs,
  } = buildModuleDashboardData(module);

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
                  Project work in this module contributes 100.0% of the overall module mark and is split across {projectPlans.length} project
                  {projectPlans.length === 1 ? "" : "s"}.
                </p>
                <ol className="module-dashboard__project-list">
                  {projectPlans.map((plan) => (
                    <li key={plan.name}>
                      <strong>{plan.name}</strong> runs from {formatLongDate(plan.startAt)} to {formatLongDate(plan.endAt)} and contributes
                      {" "}
                      {plan.weight.toFixed(1)}% of the final module mark.
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
                <span className={`module-dashboard__when module-dashboard__when--${item.whenTone}`}>{item.whenLabel}</span>,
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
                Keep module expectations current each week so teams can align around submissions, minutes, and review cycles.
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
            <p className="muted">Marks are scoped to this module. Use this tab for module-level grading visibility only.</p>
          </Card>
        </>
      )}
    </div>
  );
}
