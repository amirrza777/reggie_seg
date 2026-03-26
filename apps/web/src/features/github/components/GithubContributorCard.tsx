"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ContributorRow } from "./GithubRepoChartsDashboard.helpers";
import { ChartTooltipContent } from "@/shared/ui/ChartTooltipContent";
import {
  buildContributorMiniSeries,
  CHART_COLOR_COMMITS,
  CHART_COLOR_DELETIONS,
  CHART_COLOR_ADDITIONS,
  formatNumber,
  formatShortDate,
  getContributorWeeklyActivity,
} from "./GithubRepoChartsDashboard.helpers";

type GithubContributorCardProps = {
  contributor: ContributorRow;
  repositoryFullName?: string | null;
  showWeeklyCommitSummary?: boolean;
  weeklyDenominator?: number;
};

function getInitials(name: string) {
  const tokens = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((token) => token[0]?.toUpperCase() || "");
  return tokens.join("") || "?";
}

export function GithubContributorCard({
  contributor,
  repositoryFullName,
  showWeeklyCommitSummary = false,
  weeklyDenominator = 0,
}: GithubContributorCardProps) {
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const miniSeries = useMemo(() => buildContributorMiniSeries(contributor.commitsByDay), [contributor.commitsByDay]);
  const weeklyActivity = useMemo(() => getContributorWeeklyActivity(contributor.commitsByDay), [contributor.commitsByDay]);
  const denominator = weeklyDenominator > 0 ? weeklyDenominator : weeklyActivity.totalWeeks;
  const displayRatio = denominator > 0 ? weeklyActivity.activeWeeks / denominator : 0;
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
          {denominator > 0 ? (
            <>
              <div className="github-chart-section__contributor-weekly-row">
                <p className="github-chart-section__contributor-weekly-score">
                  {formatNumber(weeklyActivity.activeWeeks)}/{formatNumber(denominator)}
                </p>
                <p className="muted github-chart-section__contributor-weekly-percent">
                  {Math.round(displayRatio * 100)}%
                </p>
              </div>
              <div className="github-chart-section__contributor-weekly-bar" aria-hidden="true">
                <span
                  className="github-chart-section__contributor-weekly-bar-fill"
                  style={{ width: `${Math.max(0, Math.min(100, displayRatio * 100))}%` }}
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
                content={<ChartTooltipContent />}
                labelFormatter={(label) => formatShortDate(String(label))}
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
