import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GithubRepoChartsDashboard } from "./GithubRepoChartsDashboard";
import type { GithubLatestSnapshot, GithubMappingCoverage } from "../types";

vi.mock("recharts", () => {
  const makeComponent = (name: string) => {
    return ({ children }: { children?: ReactNode }) => <div data-testid={name}>{children}</div>;
  };

  return {
    ResponsiveContainer: makeComponent("ResponsiveContainer"),
    LineChart: makeComponent("LineChart"),
    BarChart: makeComponent("BarChart"),
    CartesianGrid: makeComponent("CartesianGrid"),
    XAxis: makeComponent("XAxis"),
    YAxis: makeComponent("YAxis"),
    Tooltip: makeComponent("Tooltip"),
    Legend: makeComponent("Legend"),
    Line: makeComponent("Line"),
    Bar: makeComponent("Bar"),
  };
});

vi.mock("./GithubDonutChartCard", () => ({
  GithubDonutChartCard: ({
    title,
    data,
  }: {
    title: string;
    data: Array<{ name: string; value: number }>;
  }) => (
    <section data-testid="donut-card">
      <h3>{title}</h3>
      <ul>
        {data.map((item) => (
          <li key={item.name}>
            {item.name}:{item.value}
          </li>
        ))}
      </ul>
    </section>
  ),
}));

function makeSnapshot(): GithubLatestSnapshot["snapshot"] {
  return {
    id: 1,
    analysedAt: "2026-02-26T12:00:00.000Z",
    data: {
      timeSeries: {
        defaultBranch: {
          lineChangesByDay: {
            "2026-02-01": { additions: 10, deletions: 2 },
            "2026-02-02": { additions: 8, deletions: 3 },
          },
        },
        allBranches: {
          lineChangesByDay: {
            "2026-02-01": { additions: 12, deletions: 2 },
          },
        },
      },
      branchScopeStats: {
        defaultBranch: {
          branch: "main",
          totalCommits: 8,
          totalAdditions: 100,
          totalDeletions: 20,
        },
        allBranches: {
          branchCount: 3,
          totalCommits: 10,
          totalAdditions: 120,
          totalDeletions: 30,
          commitsByBranch: { main: 8, feature: 2 },
          commitStatsCoverage: {
            detailedCommitCount: 10,
            requestedCommitCount: 10,
          },
        },
      },
    },
    userStats: [
      {
        id: 10,
        mappedUserId: 7,
        githubLogin: "madbpopye",
        isMatched: true,
        commits: 4,
        additions: 40,
        deletions: 10,
        commitsByDay: {
          "2026-02-01": 1,
          "2026-02-02": 3,
        },
      },
    ],
    repoStats: [
      {
        totalCommits: 10,
        totalAdditions: 120,
        totalDeletions: 30,
        totalContributors: 3,
        matchedContributors: 2,
        unmatchedContributors: 1,
        unmatchedCommits: 2,
        commitsByDay: {
          "2026-02-01": 3,
          "2026-02-02": 5,
          "2026-02-03": 2,
        },
      },
    ],
  };
}

function makeCoverage(): GithubMappingCoverage {
  return {
    linkId: 1,
    snapshotId: 1,
    analysedAt: "2026-02-26T12:00:00.000Z",
    coverage: {
      totalContributors: 3,
      matchedContributors: 2,
      unmatchedContributors: 1,
      totalCommits: 10,
      unmatchedCommits: 2,
    },
  };
}

describe("GithubRepoChartsDashboard", () => {
  it("renders nothing when there is no usable chart data", () => {
    render(
      <GithubRepoChartsDashboard snapshot={null} coverage={null} currentGithubLogin={null} />
    );

    expect(screen.getByRole("region", { name: "Repository charts" })).toBeInTheDocument();
    expect(screen.getByText("No chart data available for this snapshot yet.")).toBeInTheDocument();
  });

  it("renders signals and chart sections from snapshot data", () => {
    render(
      <GithubRepoChartsDashboard
        snapshot={makeSnapshot()}
        coverage={makeCoverage()}
        currentGithubLogin="madbpopye"
      />
    );

    expect(screen.getByRole("region", { name: "Repository charts" })).toBeInTheDocument();
    expect(screen.getByText("Repository Analytics")).toBeInTheDocument();
    expect(screen.getByText("Contributor cards and rankings")).toBeInTheDocument();
    expect(screen.getByText("Default vs other branches")).toBeInTheDocument();

    expect(screen.getByText("Commits over time (team vs you)")).toBeInTheDocument();
    expect(screen.getByText("Additions and deletions over time")).toBeInTheDocument();
    expect(screen.getByText("Weekly commit totals")).toBeInTheDocument();
    expect(screen.getByText("Top contributors by commits")).toBeInTheDocument();
    expect(screen.getByText("madbpopye")).toBeInTheDocument();

    expect(screen.getAllByTestId("donut-card")).toHaveLength(2);
    expect(screen.getByText("Default branch:8")).toBeInTheDocument();
    expect(screen.getByText("Other branches:2")).toBeInTheDocument();
    expect(screen.getByText("Matched commits:8")).toBeInTheDocument();
    expect(screen.getByText("Unmatched commits:2")).toBeInTheDocument();
  });

  it("renders staff-focused section labels", () => {
    render(
      <GithubRepoChartsDashboard
        snapshot={makeSnapshot()}
        coverage={makeCoverage()}
        currentGithubLogin={null}
        viewerMode="staff"
      />
    );

    expect(screen.getByText("Team Overview")).toBeInTheDocument();
    expect(screen.getByText("Contributor Breakdown")).toBeInTheDocument();
    expect(screen.getByText("Repository Activity")).toBeInTheDocument();
  });

  it("renders personal-mode charts and share donuts", () => {
    render(
      <GithubRepoChartsDashboard
        snapshot={makeSnapshot()}
        coverage={makeCoverage()}
        currentGithubLogin="madbpopye"
        viewMode="personal"
      />
    );

    expect(screen.getByText("Personal contribution analytics")).toBeInTheDocument();
    expect(screen.getByText("You vs team (commits)")).toBeInTheDocument();
    expect(screen.getByText("You vs team (line changes)")).toBeInTheDocument();
    expect(screen.getByText("My commits over time")).toBeInTheDocument();
    expect(screen.getByText("My weekly commit totals")).toBeInTheDocument();
    expect(screen.getAllByTestId("donut-card")).toHaveLength(2);
    expect(screen.getByText("You:4")).toBeInTheDocument();
    expect(screen.getByText("Team:6")).toBeInTheDocument();
  });
});
