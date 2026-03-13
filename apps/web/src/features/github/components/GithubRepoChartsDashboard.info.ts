"use client";

import type { GithubChartInfoContent } from "./GithubChartInfo";

export const githubRepoChartInfo = {
  commitsTimeline: {
    overview:
      "This line chart shows commit activity over time for the linked repository, with total team commits and your own commits shown together.",
    interpretation:
      "Use this to spot sustained activity, bursts, or inactivity windows. Commit count alone does not measure quality, but it is useful for understanding contribution rhythm.",
    staffUse:
      "Teaching staff can use this as supporting evidence of contribution timing and consistency across the project timeline, not as an automatic performance score.",
  } satisfies GithubChartInfoContent,
  lineChanges: {
    overview:
      "This bar chart shows additions and deletions per day on the default branch. Additions appear above zero and deletions below zero.",
    interpretation:
      "Large swings are normal during refactors, merges, and generated-code updates. Compare trends over time rather than treating single-day values as a quality signal.",
    staffUse:
      "Staff can use this as rough evidence of coding periods and project momentum, alongside context from commits, branches, and peer assessment data.",
  } satisfies GithubChartInfoContent,
  weeklyCommits: {
    overview:
      "This weekly chart summarizes commit totals by week to make activity patterns easier to read than daily-level noise.",
    interpretation:
      "Useful for identifying stable weeks versus unusually high or low activity. Week ranges in the tooltip show the exact period covered by each bar.",
    staffUse:
      "Staff can use this to quickly assess continuity of work during the module period and flag long gaps that may need follow-up conversation.",
  } satisfies GithubChartInfoContent,
  topContributors: {
    overview:
      "This chart ranks contributors by commit count in the latest snapshot, showing who contributed most frequently.",
    interpretation:
      "Higher commit volume does not always mean higher impact. Some valuable contributions involve fewer but larger or more complex commits.",
    staffUse:
      "Staff can use this for quick distribution checks, then cross-reference with line-change trends, branch activity, and qualitative evidence.",
  } satisfies GithubChartInfoContent,
  branchScope: {
    overview:
      "This donut compares commit volume on the default branch versus commits made on other branches in the current snapshot.",
    interpretation:
      "A higher non-default share can indicate active feature branch workflows. This is expected in teams that open pull requests before merging.",
    staffUse:
      "Staff can use this to understand collaboration workflow style and whether visible activity is primarily in merged or in-progress branch work.",
  } satisfies GithubChartInfoContent,
  mappingCoverage: {
    overview:
      "This donut shows how many commits were matched to known team identities versus unmatched commits in the latest snapshot.",
    interpretation:
      "Unmatched commits usually come from missing or inconsistent GitHub identity mapping, not necessarily missing contribution.",
    staffUse:
      "Staff can use this to judge data confidence before drawing conclusions from contribution charts and to identify when identity cleanup is needed.",
  } satisfies GithubChartInfoContent,
} as const;

