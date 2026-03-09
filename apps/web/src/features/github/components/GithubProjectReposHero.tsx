"use client";

type GithubProjectReposHeroProps = {
  connectedLogin: string | null;
  accessibleRepoCount: number;
  linkedRepoCount: number;
  loading: boolean;
};

export function GithubProjectReposHero({
  connectedLogin,
  accessibleRepoCount,
  linkedRepoCount,
  loading,
}: GithubProjectReposHeroProps) {
  return (
    <section className="github-hero">
      <div className="github-hero__top">
        <div>
          <p className="github-hero__eyebrow">Project Repositories</p>
          <p className="github-hero__title">GitHub Repository Insights</p>
          <p className="github-hero__blurb">
            Connect GitHub, install repository access if needed, and generate immutable snapshots for contribution evidence.
          </p>
        </div>
        <span className="github-hero__badge">
          {connectedLogin ? `Connected as @${connectedLogin}` : "GitHub not connected"}
        </span>
      </div>

      <div className="github-hero__chips">
        <div className="github-hero__chip">
          <div className="github-hero__chip-label">Accessible repositories</div>
          <div className="github-hero__chip-value">{loading ? "..." : accessibleRepoCount}</div>
        </div>
        <div className="github-hero__chip">
          <div className="github-hero__chip-label">Linked repositories</div>
          <div className="github-hero__chip-value">{loading ? "..." : linkedRepoCount}</div>
        </div>
        <div className="github-hero__chip">
          <div className="github-hero__chip-label">Snapshot model</div>
          <div className="github-hero__chip-value">Immutable records</div>
        </div>
      </div>
    </section>
  );
}
