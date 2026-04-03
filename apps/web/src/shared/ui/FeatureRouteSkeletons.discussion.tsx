import { Skeleton, SkeletonText } from "./Skeleton";
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
      <section className="staff-projects__hero" aria-hidden="true" style={{ display: "grid", gap: 8 }}>
        <Skeleton width="140px" height="12px" />
        <Skeleton width="360px" height="34px" />
        <SkeletonText lines={2} widths={["68%", "54%"]} />
        <div className="staff-projects__meta" style={{ marginTop: 0 }}>
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
    <div className="staff-projects staff-projects--panel-inset" role="status" aria-live="polite">
      <section className="staff-projects__hero" aria-hidden="true">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16 }}>
          <div className="ui-stack-sm">
            <Skeleton width="220px" height="34px" />
            <Skeleton width="320px" height="14px" />
          </div>
          <Skeleton width="190px" height="42px" radius="10px" />
        </div>
      </section>

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
