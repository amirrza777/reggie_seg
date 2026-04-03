import { Skeleton, SkeletonText } from "./Skeleton";

export function StaffProjectsRouteSkeleton() {
  return (
    <div className="staff-projects staff-projects--panel-inset" role="status" aria-live="polite">
      <section className="staff-projects__hero" aria-hidden="true" style={{ display: "grid", gap: 8 }}>
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

export function StaffModulesListSkeleton() {
  return (
    <div className="staff-projects staff-projects--panel-inset" role="status" aria-live="polite">
      <section className="staff-projects__hero" aria-hidden="true" style={{ display: "grid", gap: 8 }}>
        <Skeleton width="180px" height="34px" />
        <SkeletonText lines={2} widths={["64%", "52%"]} />
      </section>

      <div className="module-list" aria-hidden="true">
        <div className="module-list__toolbar">
          <Skeleton width="52px" height="14px" />
          <Skeleton width="160px" height="34px" radius="8px" />
        </div>
        <div className="module-list__grid">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="module-card">
              <Skeleton width="72%" height="20px" />
              <SkeletonText lines={2} widths={["88%", "66%"]} />
              <div style={{ display: "flex", gap: 8 }}>
                <Skeleton width="80px" height="22px" radius="999px" />
                <Skeleton width="96px" height="22px" radius="999px" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <span className="ui-visually-hidden">Loading modules</span>
    </div>
  );
}

export function StaffMarksRouteSkeleton() {
  return (
    <div className="staff-projects staff-projects--panel-inset" role="status" aria-live="polite">
      <section className="staff-projects__hero" aria-hidden="true" style={{ display: "grid", gap: 8 }}>
        <Skeleton width="140px" height="34px" />
        <SkeletonText lines={2} widths={["68%", "54%"]} />
        <div className="staff-projects__meta" style={{ marginTop: 0 }}>
          <Skeleton width="88px" height="26px" radius="999px" />
          <Skeleton width="100px" height="26px" radius="999px" />
          <Skeleton width="80px" height="26px" radius="999px" />
        </div>
        <div style={{ display: "grid", gap: 8 }}>
          <Skeleton width="200px" height="14px" />
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <Skeleton height="40px" />
            </div>
            <Skeleton width="72px" height="40px" radius="8px" />
          </div>
        </div>
      </section>

      <section className="staff-projects__module-list" aria-hidden="true">
        {Array.from({ length: 2 }).map((_, groupIndex) => (
          <div key={groupIndex} className="staff-projects__module-group" style={{ borderRadius: 8, overflow: "hidden" }}>
            <div className="staff-projects__module-summary" style={{ padding: "12px 16px" }}>
              <div className="staff-projects__module-heading">
                <Skeleton width={groupIndex === 0 ? "260px" : "220px"} height="20px" />
                <div style={{ marginTop: 4 }}>
                  <Skeleton width="140px" height="13px" />
                </div>
              </div>
            </div>
            <div className="staff-projects__module-projects">
              <div className="staff-projects__module-project-card">
                <div style={{ padding: "10px 12px 8px", borderBottom: "1px solid var(--border)" }}>
                  <Skeleton width="55%" height="16px" />
                </div>
                {Array.from({ length: 3 }).map((_, rowIndex) => (
                  <div key={rowIndex} className="staff-projects__module-project-link" style={{ pointerEvents: "none" }}>
                    <div className="staff-projects__module-project-copy">
                      <Skeleton width={`${60 + rowIndex * 10}%`} height="14px" />
                      <div style={{ marginTop: 4 }}>
                        <Skeleton width="80px" height="12px" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </section>

      <span className="ui-visually-hidden">Loading marking overview</span>
    </div>
  );
}

export function StaffModuleWorkspaceContentSkeleton() {
  return (
    <div className="stack module-dashboard" role="status" aria-live="polite">
      <header className="ui-stack-sm" aria-hidden="true">
        <Skeleton width="240px" height="28px" />
        <SkeletonText lines={1} widths={["60%"]} />
      </header>

      <div className="card" style={{ padding: 20 }} aria-hidden="true">
        <Skeleton width="130px" height="18px" />
        <SkeletonText lines={3} widths={["100%", "88%", "72%"]} />
      </div>

      <div className="card" style={{ padding: 20 }} aria-hidden="true">
        <Skeleton width="100px" height="18px" />
        <SkeletonText lines={4} widths={["96%", "84%", "90%", "66%"]} />
      </div>

      <div className="card" style={{ padding: 20 }} aria-hidden="true">
        <Skeleton width="180px" height="18px" />
        <SkeletonText lines={2} widths={["78%", "58%"]} />
      </div>

      <span className="ui-visually-hidden">Loading module content</span>
    </div>
  );
}

export function StaffModuleProjectsPageSkeleton() {
  return (
    <div className="stack module-dashboard" role="status" aria-live="polite">
      <div aria-hidden="true" style={{ display: "grid", gap: 6 }}>
        <Skeleton width="200px" height="28px" />
        <Skeleton width="380px" height="14px" />
      </div>

      <div className="staff-projects__module-list" aria-hidden="true">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="staff-projects__module-project-card">
            <div style={{ padding: "12px 14px", display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <Skeleton width={`${55 + index * 10}%`} height="18px" />
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <Skeleton width="70px" height="20px" radius="999px" />
                  <Skeleton width="80px" height="20px" radius="999px" />
                </div>
              </div>
              <Skeleton width="24px" height="24px" radius="4px" />
            </div>
          </div>
        ))}
      </div>

      <span className="ui-visually-hidden">Loading projects</span>
    </div>
  );
}

export function StaffTeamOverviewSkeleton() {
  return (
    <div className="staff-projects" role="status" aria-live="polite">
      <section className="staff-projects__grid" aria-hidden="true">
        <div className="staff-projects__card">
          <Skeleton width="120px" height="20px" />
          <SkeletonText lines={2} widths={["82%", "66%"]} />
        </div>
      </section>

      <section className="staff-projects__team-card" aria-hidden="true">
        <Skeleton width="140px" height="22px" />
        <SkeletonText lines={1} widths={["72%"]} />
        <div className="staff-projects__members">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="staff-projects__member">
              <Skeleton width="34px" height="34px" radius="50%" />
              <div style={{ flex: 1 }}>
                <Skeleton width="140px" height="14px" />
                <div style={{ marginTop: 4 }}>
                  <Skeleton width="200px" height="12px" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <span className="ui-visually-hidden">Loading team overview</span>
    </div>
  );
}
