"use client";

type GithubProjectReposHeroProps = {
  connectedLogin: string | null;
  accessibleRepoCount: number;
  linkedRepoCount: number;
  loading: boolean;
};

function GithubProjectReposHeroChip({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="github-hero__chip">
      <div className="github-hero__chip-label">{label}</div>
      <div className="github-hero__chip-value">{value}</div>
    </div>
  );
}

function GithubProjectReposHeroChips({
  loading,
  accessibleRepoCount,
  linkedRepoCount,
}: {
  loading: boolean;
  accessibleRepoCount: number;
  linkedRepoCount: number;
}) {
  return (
    <div className="github-hero__chips">
      <GithubProjectReposHeroChip label="Accessible repositories" value={loading ? "..." : accessibleRepoCount} />
      <GithubProjectReposHeroChip label="Linked repositories" value={loading ? "..." : linkedRepoCount} />
      <GithubProjectReposHeroChip label="Snapshot model" value="Immutable records" />
    </div>
  );
}

export function GithubProjectReposHero({
  connectedLogin,
  accessibleRepoCount,
  linkedRepoCount,
  loading,
}: GithubProjectReposHeroProps) {
  return (
    <section className="github-hero">
      <div className="github-hero__top">
        <div className="github-hero__intro">
          <p className="github-hero__eyebrow">Project Repositories</p>
          <h2 className="github-hero__title">GitHub Repository Insights</h2>
          <p className="github-hero__blurb">
            Connect GitHub, install repository access if needed, and generate immutable snapshots for contribution evidence.
          </p>
        </div>
        <span className="github-hero__badge">
          {connectedLogin ? `Connected as @${connectedLogin}` : "GitHub not connected"}
        </span>
      </div>
      <GithubProjectReposHeroChips loading={loading} accessibleRepoCount={accessibleRepoCount} linkedRepoCount={linkedRepoCount} />
    </section>
  );
}
