import { Skeleton, SkeletonText } from "./Skeleton";
import { Card } from "./Card";
import { Table } from "./Table";
import { DiscussionPostsSkeleton, QuestionnaireListSkeleton } from "./LoadingSkeletonBlocks";

export function DiscussionRouteSkeleton() {
  return (
    <div className="discussion-forum stack projects-panel" role="status" aria-live="polite">
      <header className="projects-panel__header discussion-forum__header">
        <Skeleton width="260px" height="30px" />
        <Skeleton width="460px" height="14px" />
      </header>

      <form className="card discussion-composer" aria-hidden="true">
        <div className="discussion-composer__body">
          <div className="discussion-field">
            <Skeleton width="84px" height="11px" />
            <Skeleton height="40px" />
          </div>
          <div className="discussion-field">
            <Skeleton width="68px" height="11px" />
            <Skeleton height="132px" />
          </div>
          <div className="discussion-composer__actions">
            <Skeleton width="92px" height="34px" radius="10px" />
          </div>
        </div>
      </form>

      <section className="stack discussion-posts" aria-label="Posts loading">
        <DiscussionPostsSkeleton includeHeading announce={false} />
      </section>
      <span className="ui-visually-hidden">Loading discussion content</span>
    </div>
  );
}

export function StaffDiscussionRouteSkeleton() {
  return (
    <div className="staff-projects" role="status" aria-live="polite">
      <section className="staff-projects__hero" aria-hidden="true">
        <Skeleton width="140px" height="12px" />
        <Skeleton width="360px" height="34px" />
        <SkeletonText lines={2} widths={["68%", "54%"]} />
        <div className="staff-projects__meta">
          <Skeleton width="88px" height="26px" radius="999px" />
          <Skeleton width="106px" height="26px" radius="999px" />
          <Skeleton width="110px" height="26px" radius="999px" />
        </div>
      </section>

      <section className="staff-projects__team-card" aria-hidden="true">
        <Skeleton width="160px" height="24px" />
        <Skeleton width="420px" height="13px" />
        <div className="card stack" style={{ padding: 20 }}>
          <SkeletonText lines={2} widths={["42%", "76%"]} />
          <Skeleton width="140px" height="18px" />
        </div>
      </section>

      <section className="staff-projects__team-card" aria-hidden="true">
        <Skeleton width="180px" height="24px" />
        <div className="stack">
          <div className="card" style={{ padding: 16 }}>
            <SkeletonText lines={3} widths={["38%", "66%", "84%"]} />
          </div>
          <div className="card" style={{ padding: 16 }}>
            <SkeletonText lines={2} widths={["34%", "70%"]} />
          </div>
        </div>
      </section>

      <section className="staff-projects__team-card" aria-hidden="true">
        <Skeleton width="170px" height="24px" />
        <Skeleton width="320px" height="13px" />
        <div style={{ marginTop: 10 }}>
          <DiscussionRouteSkeleton />
        </div>
      </section>
      <span className="ui-visually-hidden">Loading staff discussion content</span>
    </div>
  );
}

export function TrelloRouteSkeleton() {
  return (
    <div className="stack" role="status" aria-live="polite">
      <header className="stack" aria-hidden="true">
        <div className="projects-panel__header">
          <Skeleton width="110px" height="30px" />
          <Skeleton width="300px" height="14px" />
        </div>
        <nav className="pill-nav">
          <Skeleton width="80px" height="32px" radius="10px" />
          <Skeleton width="70px" height="32px" radius="10px" />
          <Skeleton width="72px" height="32px" radius="10px" />
        </nav>
      </header>

      <section className="card" style={{ padding: 16 }} aria-hidden="true">
        <Skeleton width="190px" height="20px" />
        <SkeletonText lines={2} widths={["62%", "48%"]} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="card" style={{ padding: 12 }}>
              <Skeleton width="74%" height="14px" />
              <SkeletonText lines={3} widths={["96%", "88%", "70%"]} />
            </div>
          ))}
        </div>
      </section>
      <span className="ui-visually-hidden">Loading Trello content</span>
    </div>
  );
}

export function GithubReposRouteSkeleton() {
  return (
    <div className="stack github-project-repos-section" role="status" aria-live="polite">
      <section className="github-hero" aria-hidden="true">
        <div className="github-hero__top">
          <div className="github-hero__intro">
            <Skeleton width="170px" height="11px" />
            <Skeleton width="320px" height="30px" />
            <SkeletonText lines={2} widths={["70%", "92%"]} />
          </div>
          <Skeleton width="170px" height="28px" radius="999px" />
        </div>
        <div className="github-hero__chips">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="github-hero__chip">
              <Skeleton width="130px" height="11px" />
              <Skeleton width="90px" height="20px" />
            </div>
          ))}
        </div>
      </section>

      <section className="github-project-repos-tabs" aria-hidden="true">
        <div className="github-project-repos-tabs__row">
          <Skeleton width="140px" height="34px" radius="10px" />
          <Skeleton width="146px" height="34px" radius="10px" />
        </div>
      </section>

      <section className="github-project-repos-section__header-card" aria-hidden="true">
        <Skeleton width="130px" height="11px" />
        <Skeleton width="380px" height="28px" />
        <SkeletonText lines={1} widths={["72%"]} />
      </section>

      <section className="github-repos-tab" aria-hidden="true">
        <div className="github-repos-tab__list">
          <div className="github-repos-tab__subpanel">
            <SkeletonText lines={2} widths={["52%", "36%"]} />
            <SkeletonText lines={4} widths={["100%", "92%", "84%", "76%"]} />
          </div>
          <div className="github-repos-tab__subpanel">
            <SkeletonText lines={2} widths={["48%", "32%"]} />
            <SkeletonText lines={4} widths={["100%", "92%", "84%", "76%"]} />
          </div>
        </div>
      </section>
      <span className="ui-visually-hidden">Loading repository analytics</span>
    </div>
  );
}

export function StaffQuestionnairesRouteSkeleton() {
  return (
    <div className="stack ui-page" style={{ gap: 24 }} role="status" aria-live="polite">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16 }}>
        <div className="ui-stack-sm" aria-hidden="true">
          <Skeleton width="220px" height="34px" />
          <Skeleton width="320px" height="14px" />
        </div>
        <Skeleton width="190px" height="42px" radius="10px" aria-hidden="true" />
      </div>

      <QuestionnaireListSkeleton announce={false} />
      <span className="ui-visually-hidden">Loading questionnaires</span>
    </div>
  );
}

export function EnterpriseForumReportsRouteSkeleton() {
  return (
    <div className="ui-page enterprise-overview-page" role="status" aria-live="polite">
      <header className="ui-page__header" aria-hidden="true">
        <Skeleton width="210px" height="32px" />
        <Skeleton width="460px" height="14px" />
      </header>

      <div className="card user-management-card" aria-hidden="true">
        <div className="card__header">
          <Skeleton width="160px" height="24px" />
        </div>
        <div className="card__body">
          <div className="table">
            <div className="table__head" style={{ gridTemplateColumns: "1.2fr 1.1fr 1.1fr 1.4fr 0.8fr 1fr" }}>
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} height="12px" width={index === 3 ? "80%" : "60%"} />
              ))}
            </div>
            {Array.from({ length: 4 }).map((_, rowIndex) => (
              <div
                key={rowIndex}
                className="table__row"
                style={{ gridTemplateColumns: "1.2fr 1.1fr 1.1fr 1.4fr 0.8fr 1fr" }}
              >
                {Array.from({ length: 6 }).map((_, colIndex) => (
                  <Skeleton key={colIndex} height="12px" width={colIndex === 3 ? "90%" : "68%"} />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      <span className="ui-visually-hidden">Loading forum reports</span>
    </div>
  );
}

export function DashboardRouteSkeleton() {
  return (
    <div className="stack stack--tabbed" role="status" aria-live="polite">
      <Card title={<span className="overview-title">Modules overview</span>}>
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
      <nav className="pill-nav" aria-hidden="true">
        <Skeleton width="112px" height="34px" radius="10px" />
        <Skeleton width="84px" height="34px" radius="10px" />
      </nav>

      <Card title={<Skeleton width="240px" height="28px" />}>
        <SkeletonText lines={2} widths={["72%", "56%"]} />
      </Card>

      <Card title="Module brief">
        <SkeletonText lines={3} widths={["100%", "88%", "70%"]} />
      </Card>

      <Card title="Projects in this module">
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
      </Card>

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

export function StaffProjectsRouteSkeleton() {
  return (
    <div className="staff-projects" role="status" aria-live="polite">
      <section className="staff-projects__hero" aria-hidden="true">
        <Skeleton width="130px" height="12px" />
        <Skeleton width="360px" height="34px" />
        <SkeletonText lines={2} widths={["66%", "52%"]} />
      </section>

      <section className="staff-projects__team-card" aria-hidden="true">
        <Skeleton width="220px" height="24px" />
        <SkeletonText lines={1} widths={["58%"]} />
        <div className="table">
          <div className="table__head">
            <Skeleton width="56%" height="11px" />
            <Skeleton width="56%" height="11px" />
            <Skeleton width="56%" height="11px" />
          </div>
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="table__row">
              <Skeleton width="86%" height="11px" />
              <Skeleton width="70%" height="11px" />
              <Skeleton width="64%" height="11px" />
            </div>
          ))}
        </div>
      </section>

      <span className="ui-visually-hidden">Loading staff project content</span>
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
      <Card title={<span className="overview-title">Admin workspace</span>}>
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
