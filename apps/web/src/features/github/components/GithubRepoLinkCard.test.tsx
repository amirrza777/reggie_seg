import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GithubRepoLinkCard } from "./GithubRepoLinkCard";
import type { GithubLatestSnapshot, GithubMappingCoverage, ProjectGithubRepoLink } from "../types";

vi.mock("./GithubRepoChartsDashboard", () => ({
  GithubRepoChartsDashboard: () => <div data-testid="github-repo-charts-dashboard" />,
}));

function makeLink(overrides?: Partial<ProjectGithubRepoLink>): ProjectGithubRepoLink {
  return {
    id: 1,
    projectId: 42,
    githubRepositoryId: 10,
    linkedByUserId: 3,
    isActive: true,
    autoSyncEnabled: true,
    syncIntervalMinutes: 60,
    lastSyncedAt: null,
    nextSyncAt: null,
    createdAt: "2026-02-26T00:00:00.000Z",
    updatedAt: "2026-02-26T00:00:00.000Z",
    repository: {
      id: 10,
      githubRepoId: 999,
      ownerLogin: "team",
      name: "repo",
      fullName: "team/repo",
      htmlUrl: "https://github.com/team/repo",
      isPrivate: false,
      defaultBranch: "main",
      pushedAt: null,
      updatedAt: "2026-02-26T00:00:00.000Z",
    },
    ...overrides,
  };
}

function makeSnapshot(overrides?: Partial<GithubLatestSnapshot["snapshot"]>): GithubLatestSnapshot["snapshot"] {
  return {
    id: 5,
    analysedAt: "2026-02-26T12:00:00.000Z",
    data: {
      branchScopeStats: {
        defaultBranch: {
          branch: "main",
          totalCommits: 12,
          totalAdditions: 120,
          totalDeletions: 30,
        },
        allBranches: {
          branchCount: 3,
          totalCommits: 20,
          totalAdditions: 200,
          totalDeletions: 80,
          commitsByBranch: { main: 12, dev: 6, feature: 2 },
          commitStatsCoverage: {
            detailedCommitCount: 20,
            requestedCommitCount: 20,
          },
        },
      },
    },
    userStats: [],
    repoStats: [
      {
        totalCommits: 12,
        totalAdditions: 120,
        totalDeletions: 30,
        totalContributors: 2,
        matchedContributors: 2,
        unmatchedContributors: 0,
        unmatchedCommits: 0,
        commitsByDay: { "2026-02-26": 2 },
      },
    ],
    ...overrides,
  };
}

function makeCoverage(overrides?: Partial<GithubMappingCoverage>): GithubMappingCoverage {
  return {
    linkId: 1,
    snapshotId: 5,
    analysedAt: "2026-02-26T12:00:00.000Z",
    coverage: {
      totalContributors: 2,
      matchedContributors: 2,
      unmatchedContributors: 0,
      totalCommits: 20,
      unmatchedCommits: 0,
    },
    ...overrides,
  };
}

describe("GithubRepoLinkCard", () => {
  it("renders repo summary and overview stats from branch scope snapshot data", () => {
    render(
      <GithubRepoLinkCard
        link={makeLink()}
        coverage={makeCoverage()}
        snapshot={makeSnapshot()}
        currentGithubLogin="alice"
        busy={false}
        loading={false}
        removingLinkId={null}
        onRemoveLink={() => {}}
      />
    );

    expect(screen.getByText("team/repo")).toBeInTheDocument();
    expect(screen.getByText("Public repository")).toBeInTheDocument();
    expect(screen.getByText("Default branch main")).toBeInTheDocument();
    expect(screen.getByLabelText("Repository overview")).toBeInTheDocument();
    expect(screen.getByText("Default branch commits")).toBeInTheDocument();
    expect(screen.getByText("All-branches commits")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("20")).toBeInTheDocument();
    expect(screen.getByTestId("github-repo-charts-dashboard")).toBeInTheDocument();
  });

  it("falls back to repo totals and shows not analysed yet when no coverage timestamp exists", () => {
    render(
      <GithubRepoLinkCard
        link={makeLink({ repository: { ...makeLink().repository, isPrivate: true, defaultBranch: null } })}
        coverage={makeCoverage({ analysedAt: null, coverage: null, snapshotId: null })}
        snapshot={makeSnapshot({
          data: null,
          repoStats: [
            {
              totalCommits: 7,
              totalAdditions: 70,
              totalDeletions: 10,
              totalContributors: 1,
              matchedContributors: 1,
              unmatchedContributors: 0,
              unmatchedCommits: 0,
              commitsByDay: {},
            },
          ],
        })}
        currentGithubLogin={null}
        busy={false}
        loading={false}
        removingLinkId={null}
        onRemoveLink={() => {}}
      />
    );

    expect(screen.getByText("Private repository")).toBeInTheDocument();
    expect(screen.getByText("Default branch unknown")).toBeInTheDocument();
    expect(screen.getByText("Analysed Not analysed yet")).toBeInTheDocument();
    expect(screen.getAllByText("7").length).toBeGreaterThan(0);
  });

  it("calls onRemoveLink with the current link id and shows disabled removing state", () => {
    const onRemoveLink = vi.fn();

    render(
      <GithubRepoLinkCard
        link={makeLink({ id: 9 })}
        coverage={makeCoverage()}
        snapshot={makeSnapshot()}
        currentGithubLogin="alice"
        busy={false}
        loading={false}
        removingLinkId={null}
        onRemoveLink={onRemoveLink}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Remove link" }));
    expect(onRemoveLink).toHaveBeenCalledWith(9);

    render(
      <GithubRepoLinkCard
        link={makeLink({ id: 9 })}
        coverage={makeCoverage()}
        snapshot={makeSnapshot()}
        currentGithubLogin="alice"
        busy={false}
        loading={false}
        removingLinkId={9}
        onRemoveLink={onRemoveLink}
      />
    );

    expect(screen.getByRole("button", { name: "Removing..." })).toBeDisabled();
  });
});

