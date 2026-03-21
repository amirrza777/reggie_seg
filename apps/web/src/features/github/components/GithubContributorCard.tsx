"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ContributorRow } from "./GithubRepoChartsDashboard.helpers";
import {
  buildContributorMiniSeries,
  CHART_COLOR_COMMITS,
  CHART_COLOR_DELETIONS,
  CHART_COLOR_ADDITIONS,
  formatNumber,
  formatShortDate,
  isoWeekKey,
} from "./GithubRepoChartsDashboard.helpers";

type GithubContributorCardProps = {
  contributor: ContributorRow;
  repositoryFullName?: string | null;
  showWeeklyCommitSummary?: boolean;
};

function getInitials(name: string) {
  const tokens = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((token) => token[0]?.toUpperCase() || "");
  return tokens.join("") || "?";
}

function getWeeklyActivity(commitsByDay: Record<string, number> | null) {
  if (!commitsByDay || typeof commitsByDay !== "object") {
    return { activeWeeks: 0, totalWeeks: 0, ratio: 0 };
  }

  const days = Object.entries(commitsByDay)
    .map(([date, commits]) => ({ date, commits: Number(commits ?? 0) }))
    .sort((a, b) => a.date.localeCompare(b.date));

  if (days.length <= 0) {
    return { activeWeeks: 0, totalWeeks: 0, ratio: 0 };
  }

  const activeWeekTotals = new Map<string, number>();
  for (const day of days) {
    const week = isoWeekKey(day.date);
    if (!week) continue;
    activeWeekTotals.set(week, (activeWeekTotals.get(week) ?? 0) + day.commits);
  }

  const weekKeys = new Set<string>();
  const start = new Date(`${days[0].date}T00:00:00Z`);
  const end = new Date(`${days[days.length - 1].date}T00:00:00Z`);

  if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && start <= end) {
    const cursor = new Date(start.getTime());
    while (cursor <= end) {
      const week = isoWeekKey(cursor.toISOString().slice(0, 10));
      if (week) weekKeys.add(week);
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  }

  const activeWeeks = Array.from(activeWeekTotals.values()).filter((total) => total > 0).length;
  const totalWeeks = weekKeys.size;
  const ratio = totalWeeks > 0 ? activeWeeks / totalWeeks : 0;

  return { activeWeeks, totalWeeks, ratio };
}

export function GithubContributorCard({
  contributor,
  repositoryFullName,
  showWeeklyCommitSummary = false,
}: GithubContributorCardProps) {
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const miniSeries = useMemo(() => buildContributorMiniSeries(contributor.commitsByDay), [contributor.commitsByDay]);
  const weeklyActivity = useMemo(() => getWeeklyActivity(contributor.commitsByDay), [contributor.commitsByDay]);
  const contributorsGraphUrl = repositoryFullName
    ? `https://github.com/${repositoryFullName}/graphs/contributors`
    : null;
  const avatarUrl = contributor.login ? `https://github.com/${contributor.login}.png?size=80` : null;

  const inner = (
    <>
      <div className="github-chart-section__contributor-head">
        <div className="github-chart-section__contributor-ident">
          <span className="github-chart-section__contributor-avatar" aria-hidden="true">
            {avatarUrl && !avatarLoadFailed ? (
              <img
                src={avatarUrl}
                alt=""
                width={34}
                height={34}
                loading="lazy"
                onError={() => setAvatarLoadFailed(true)}
              />
            ) : (
              <span>{getInitials(contributor.name)}</span>
            )}
          </span>
          <div className="github-chart-section__contributor-name-wrap">
            <p className="github-chart-section__contributor-name">{contributor.name}</p>
            <p className="github-chart-section__contributor-meta">
              {formatNumber(contributor.commits)} commits
            </p>
          </div>
        </div>
        <span className="github-chart-section__contributor-rank">#{contributor.rank}</span>
      </div>

      <p className="github-chart-section__contributor-delta">
        <span style={{ color: CHART_COLOR_ADDITIONS }}>+{formatNumber(contributor.additions)}</span>
        <span style={{ color: CHART_COLOR_DELETIONS }}>-{formatNumber(contributor.deletions)}</span>
      </p>

      {showWeeklyCommitSummary ? (
        <div className="github-chart-section__contributor-weekly">
          <p className="muted github-chart-section__contributor-weekly-label">Active coding weeks</p>
          {weeklyActivity.totalWeeks > 0 ? (
            <>
              <div className="github-chart-section__contributor-weekly-row">
                <p className="github-chart-section__contributor-weekly-score">
                  {formatNumber(weeklyActivity.activeWeeks)}/{formatNumber(weeklyActivity.totalWeeks)}
                </p>
                <p className="muted github-chart-section__contributor-weekly-percent">
                  {Math.round(weeklyActivity.ratio * 100)}%
                </p>
              </div>
              <div className="github-chart-section__contributor-weekly-bar" aria-hidden="true">
                <span
                  className="github-chart-section__contributor-weekly-bar-fill"
                  style={{ width: `${Math.max(0, Math.min(100, weeklyActivity.ratio * 100))}%` }}
                />
              </div>
            </>
          ) : (
            <p className="muted github-chart-section__contributor-weekly-values">No weekly breakdown available</p>
          )}
        </div>
      ) : null}

      {miniSeries.length > 0 ? (
        <div className="github-chart-section__contributor-mini">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={miniSeries} margin={{ top: 8, right: 0, left: 0, bottom: 0 }} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="date"
                interval={0}
                tickMargin={10}
                tick={{ fill: "var(--muted)", fontSize: 10 }}
                tickFormatter={formatShortDate}
              />
              <YAxis allowDecimals={false} hide />
              <Tooltip
                labelFormatter={(label) => formatShortDate(String(label))}
                contentStyle={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                }}
              />
              <Bar dataKey="commits" fill={CHART_COLOR_COMMITS} maxBarSize={20} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="muted github-chart-section__contributor-empty">No daily breakdown available</p>
      )}

      <p className="muted github-chart-section__contributor-hint">Open GitHub contributors graph</p>
    </>
  );

  if (contributorsGraphUrl) {
    return (
      <a
        href={contributorsGraphUrl}
        target="_blank"
        rel="noreferrer"
        className="github-chart-section__contributor-card github-chart-section__contributor-card--interactive"
      >
        {inner}
      </a>
    );
  }

  return <article className="github-chart-section__contributor-card">{inner}</article>;
}
