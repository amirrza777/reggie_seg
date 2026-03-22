import type { ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
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
    expect(screen.getByRole("tab", { name: "Team charts" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Contributors" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Branch activity" })).toBeInTheDocument();

    expect(screen.getByText("Commits over time")).toBeInTheDocument();
    expect(screen.getByText("Additions and deletions over time")).toBeInTheDocument();
    expect(screen.getByText("Weekly commit totals")).toBeInTheDocument();
    expect(screen.queryByText("Top contributors by commits")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Contributors" }));
    expect(screen.getByText("madbpopye")).toBeInTheDocument();
    expect(screen.getByText("Active coding weeks")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Branch activity" }));
    expect(screen.queryByText("Default vs other branches")).not.toBeInTheDocument();
    expect(screen.getByText("All branch commits")).toBeInTheDocument();
  });

  it("normalizes all-branch commit totals in branch activity when default-branch is higher", () => {
    const snapshot = makeSnapshot();
    snapshot.data.branchScopeStats.defaultBranch.totalCommits = 10;
    snapshot.data.branchScopeStats.allBranches.totalCommits = 8;
    snapshot.repoStats[0].totalCommits = 10;

    render(
      <GithubRepoChartsDashboard
        snapshot={snapshot}
        coverage={makeCoverage()}
        currentGithubLogin="madbpopye"
      />
    );

    fireEvent.click(screen.getByRole("tab", { name: "Branch activity" }));
    const allBranchCommitsMetric = screen.getByText("All branch commits").parentElement;
    expect(allBranchCommitsMetric).toHaveTextContent("10");
    expect(allBranchCommitsMetric).not.toHaveTextContent("8");
  });

  it("renders staff mode with team activity labels", () => {
    render(
      <GithubRepoChartsDashboard
        snapshot={makeSnapshot()}
        coverage={makeCoverage()}
        currentGithubLogin={null}
        viewerMode="staff"
      />
    );

    expect(screen.getByText("Repository Analytics")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Team charts" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Contributors" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Branch activity" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Contributors" }));
    expect(screen.getByText("Active coding weeks")).toBeInTheDocument();
  });

  it("uses max active weeks as a shared denominator across contributor cards", () => {
    const snapshot = makeSnapshot();
    snapshot.userStats = [
      {
        id: 10,
        mappedUserId: 7,
        githubLogin: "madbpopye",
        isMatched: true,
        commits: 2,
        additions: 20,
        deletions: 5,
        commitsByDay: {
          "2026-02-02": 1,
          "2026-02-23": 1,
        },
      },
      {
        id: 11,
        mappedUserId: 9,
        githubLogin: "teammate",
        isMatched: true,
        commits: 2,
        additions: 18,
        deletions: 6,
        commitsByDay: {
          "2026-02-02": 1,
        },
      },
    ];

    render(
      <GithubRepoChartsDashboard
        snapshot={snapshot}
        coverage={makeCoverage()}
        currentGithubLogin={null}
      />
    );

    fireEvent.click(screen.getByRole("tab", { name: "Contributors" }));
    expect(screen.getAllByText("2/2").length).toBeGreaterThan(0);
    expect(screen.getAllByText("1/2").length).toBeGreaterThan(0);
    expect(screen.queryByText("1/4")).not.toBeInTheDocument();
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
    expect(screen.queryByText("Additions and deletions over time")).not.toBeInTheDocument();
    expect(screen.getByText("My weekly commit totals")).toBeInTheDocument();
    expect(screen.getAllByTestId("donut-card")).toHaveLength(2);
    expect(screen.getByText("You:4")).toBeInTheDocument();
    expect(screen.getByText("Team:6")).toBeInTheDocument();
  });
});
