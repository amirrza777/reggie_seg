"use client";

import type React from "react";

type GithubProjectReposHeroProps = {
  connectedLogin: string | null;
  accessibleRepoCount: number;
  linkedRepoCount: number;
  loading: boolean;
};

const styles = {
  hero: {
    border: "1px solid var(--border)",
    borderRadius: 16,
    background:
      "radial-gradient(circle at 12% 12%, color-mix(in srgb, var(--accent) 22%, transparent), transparent 45%), linear-gradient(135deg, color-mix(in srgb, var(--surface) 88%, var(--accent) 12%), var(--surface))",
    padding: 18,
    boxShadow: "var(--shadow-sm)",
  } as React.CSSProperties,
  topRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-start",
    flexWrap: "wrap",
  } as React.CSSProperties,
  eyebrow: {
    margin: 0,
    fontSize: 12,
    color: "var(--muted)",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  } as React.CSSProperties,
  title: {
    margin: "4px 0 0",
    fontSize: 22,
    lineHeight: 1.1,
    fontWeight: 800,
    color: "var(--ink)",
  } as React.CSSProperties,
  blurb: {
    margin: "8px 0 0",
    maxWidth: 760,
    color: "var(--muted)",
  } as React.CSSProperties,
  badge: {
    border: "1px solid var(--border)",
    background: "var(--surface)",
    color: "var(--muted)",
    borderRadius: 999,
    padding: "6px 10px",
    fontSize: 12,
    whiteSpace: "nowrap",
  } as React.CSSProperties,
  chipRow: {
    marginTop: 12,
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 8,
  } as React.CSSProperties,
  chip: {
    border: "1px solid var(--border)",
    borderRadius: 12,
    padding: "10px 12px",
    background: "var(--glass-surface)",
  } as React.CSSProperties,
  chipLabel: {
    color: "var(--muted)",
    fontSize: 12,
    marginBottom: 2,
  } as React.CSSProperties,
  chipValue: {
    fontWeight: 700,
    fontSize: 16,
    lineHeight: 1.1,
  } as React.CSSProperties,
};

export function GithubProjectReposHero({
  connectedLogin,
  accessibleRepoCount,
  linkedRepoCount,
  loading,
}: GithubProjectReposHeroProps) {
  return (
    <section style={styles.hero}>
      <div style={styles.topRow}>
        <div>
          <p style={styles.eyebrow}>Project Repositories</p>
          <p style={styles.title}>GitHub Repository Insights</p>
          <p style={styles.blurb}>
            Connect GitHub, install repository access if needed, and generate immutable snapshots for contribution evidence.
          </p>
        </div>
        <span style={styles.badge}>
          {connectedLogin ? `Connected as @${connectedLogin}` : "GitHub not connected"}
        </span>
      </div>

      <div style={styles.chipRow}>
        <div style={styles.chip}>
          <div style={styles.chipLabel}>Accessible repositories</div>
          <div style={styles.chipValue}>{loading ? "..." : accessibleRepoCount}</div>
        </div>
        <div style={styles.chip}>
          <div style={styles.chipLabel}>Linked repositories</div>
          <div style={styles.chipValue}>{loading ? "..." : linkedRepoCount}</div>
        </div>
        <div style={styles.chip}>
          <div style={styles.chipLabel}>Snapshot model</div>
          <div style={styles.chipValue}>Immutable records</div>
        </div>
      </div>
    </section>
  );
}
