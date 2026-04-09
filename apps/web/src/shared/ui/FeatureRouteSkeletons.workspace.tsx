import { Card } from "./Card";
import { Table } from "./Table";
import { Skeleton, SkeletonText } from "./Skeleton";

function ModuleDetailTabsSkeleton() {
  return (
    <nav className="pill-nav" aria-hidden="true">
      <Skeleton width="112px" height="34px" radius="10px" />
      <Skeleton width="84px" height="34px" radius="10px" />
    </nav>
  );
}

function ModuleDetailProjectsSkeleton() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }} aria-hidden="true">
      {Array.from({ length: 2 }).map((_, index) => (
        <div key={index} className="card">
          <div className="card__body ui-stack-sm">
            <Skeleton width="68%" height="16px" />
            <SkeletonText lines={2} widths={["88%", "62%"]} />
          </div>
        </div>
      ))}
    </div>
  );
}

function ModuleDetailSummaryCardsSkeleton() {
  return (
    <>
      <Card title={<Skeleton width="240px" height="28px" />}>
        <SkeletonText lines={2} widths={["72%", "56%"]} />
      </Card>
      <Card title="Module brief">
        <SkeletonText lines={3} widths={["100%", "88%", "70%"]} />
      </Card>
      <Card title="Projects in this module">
        <ModuleDetailProjectsSkeleton />
      </Card>
    </>
  );
}

function ModuleDetailTablesSkeleton() {
  return (
    <>
      <Card title="Timeline">
        <Table
          headers={["When?", "Date & time", "Details"]}
          rows={[]}
          isLoading
          loadingLabel="Loading module timeline"
          loadingRowCount={4}
        />
      </Card>
      <Card title="Module expectations">
        <Table
          headers={["Expectation", "Target", "Owner"]}
          rows={[]}
          isLoading
          loadingLabel="Loading module expectations"
          loadingRowCount={4}
        />
      </Card>
    </>
  );
}

export function DashboardRouteSkeleton() {
  return (
    <div className="stack stack--tabbed" role="status" aria-live="polite">
      <Card title="Modules overview">
        <SkeletonText lines={1} widths={["56%"]} />
      </Card>

      <Card title="Active modules">
        <Table
          headers={["Code", "Title", "Teams"]}
          rows={[]}
          isLoading
          loadingLabel="Loading active modules"
          loadingRowCount={6}
        />
      </Card>

      <Card title="Upcoming deadlines" action={<Skeleton width="132px" height="34px" radius="10px" />}>
        <Table
          headers={["Project", "Type", "Due"]}
          rows={[]}
          isLoading
          loadingLabel="Loading upcoming deadlines"
          loadingRowCount={4}
        />
      </Card>

      <span className="ui-visually-hidden">Loading dashboard content</span>
    </div>
  );
}

export function ModuleDetailRouteSkeleton() {
  return (
    <div className="stack stack--tabbed module-dashboard" role="status" aria-live="polite">
      <ModuleDetailTabsSkeleton />
      <ModuleDetailSummaryCardsSkeleton />
      <ModuleDetailTablesSkeleton />
      <Card title="Readiness notes">
        <SkeletonText lines={2} widths={["92%", "74%"]} />
      </Card>

      <span className="ui-visually-hidden">Loading module details</span>
    </div>
  );
}

export function ProjectWorkspaceRouteSkeleton() {
  return (
    <div className="stack projects-panel" role="status" aria-live="polite">
      <header className="projects-panel__header" aria-hidden="true">
        <Skeleton width="300px" height="30px" />
        <Skeleton width="520px" height="14px" />
      </header>

      <Card title="Overview">
        <SkeletonText lines={2} widths={["78%", "64%"]} />
      </Card>

      <Card title="Details">
        <Table
          headers={["Item", "Status", "Owner"]}
          rows={[]}
          isLoading
          loadingLabel="Loading project details"
          loadingRowCount={5}
        />
      </Card>

      <Card title="Actions">
        <div className="ui-row ui-row--wrap" aria-hidden="true">
          <Skeleton width="120px" height="34px" radius="10px" />
          <Skeleton width="146px" height="34px" radius="10px" />
          <Skeleton width="110px" height="34px" radius="10px" />
        </div>
      </Card>

      <span className="ui-visually-hidden">Loading project workspace</span>
    </div>
  );
}

export function ProjectsListRouteSkeleton() {
  return (
    <div className="stack ui-page projects-panel" role="status" aria-live="polite">
      <header className="projects-panel__header" aria-hidden="true">
        <Skeleton width="200px" height="34px" />
        <Skeleton width="460px" height="14px" />
      </header>

      <section className="project-list" aria-hidden="true">
        <div className="project-list__grid">
          {Array.from({ length: 4 }).map((_, index) => (
            <article key={index} className="project-card">
              <Skeleton width="58%" height="18px" />
              <div style={{ marginTop: 8 }}>
                <Skeleton width="84%" height="12px" />
              </div>
              <div style={{ marginTop: 8 }}>
                <Skeleton width="64%" height="12px" />
              </div>
            </article>
          ))}
        </div>
      </section>

      <span className="ui-visually-hidden">Loading projects</span>
    </div>
  );
}

export function GenericAppRouteSkeleton() {
  return (
    <div className="stack stack--tabbed" role="status" aria-live="polite">
      <Card title={<Skeleton width="240px" height="28px" />}>
        <SkeletonText lines={1} widths={["62%"]} />
      </Card>

      <Card title="Content">
        <Table
          headers={["Column 1", "Column 2", "Column 3"]}
          rows={[]}
          isLoading
          loadingLabel="Loading content"
          loadingRowCount={5}
        />
      </Card>

      <Card title="Summary">
        <SkeletonText lines={2} widths={["70%", "48%"]} />
      </Card>

      <span className="ui-visually-hidden">Loading page content</span>
    </div>
  );
}

export function AdminRouteSkeleton() {
  return (
    <div className="stack stack--tabbed" role="status" aria-live="polite">
      <Card title="Admin workspace">
        <SkeletonText lines={1} widths={["54%"]} />
      </Card>

      <Card title="Accounts" action={<Skeleton width="260px" height="36px" radius="10px" />}>
        <Table
          headers={["Email", "Name", "Role", "Status"]}
          rows={[]}
          isLoading
          loadingLabel="Loading admin accounts"
          loadingRowCount={6}
        />
      </Card>

      <Card title="Enterprises">
        <Table
          headers={["Enterprise", "Users", "Workspace", "Created"]}
          rows={[]}
          isLoading
          loadingLabel="Loading enterprises"
          loadingRowCount={5}
        />
      </Card>

      <span className="ui-visually-hidden">Loading admin content</span>
    </div>
  );
}

export function EnterpriseRouteSkeleton() {
  return (
    <div className="ui-page enterprise-overview-page" role="status" aria-live="polite">
      <header className="ui-page__header" aria-hidden="true">
        <Skeleton width="280px" height="32px" />
        <Skeleton width="520px" height="14px" />
      </header>

      <div className="ui-grid-metrics" aria-hidden="true">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="ui-metric-card">
            <Skeleton width="64%" height="12px" />
            <Skeleton width="42%" height="22px" />
          </div>
        ))}
      </div>

      <Card title="Enterprise modules">
        <Table
          headers={["Module", "Leaders", "TAs", "Students", "Updated"]}
          rows={[]}
          isLoading
          loadingLabel="Loading enterprise modules"
          loadingRowCount={6}
        />
      </Card>

      <span className="ui-visually-hidden">Loading enterprise content</span>
    </div>
  );
}

export function HelpRouteSkeleton() {
  return (
    <div className="ui-page" role="status" aria-live="polite">
      <header className="ui-page__header" aria-hidden="true">
        <Skeleton width="220px" height="30px" />
        <Skeleton width="500px" height="14px" />
      </header>
      <div className="stack" aria-hidden="true">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} title={<Skeleton width="220px" height="20px" />}>
            <SkeletonText lines={2} widths={["88%", "62%"]} />
          </Card>
        ))}
      </div>
      <span className="ui-visually-hidden">Loading help content</span>
    </div>
  );
}
