import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { StaffProjectReposReadOnlyClient } from "./StaffProjectReposReadOnlyClient";
import type { ProjectGithubRepoLink } from "../types";

const listProjectGithubRepoLinksMock = vi.fn();
const getProjectGithubMappingCoverageMock = vi.fn();
const getLatestProjectGithubSnapshotMock = vi.fn();
const analyseProjectGithubRepoMock = vi.fn();
const listLiveProjectGithubRepoBranchCommitsMock = vi.fn();

vi.mock("../api/client", () => ({
  listProjectGithubRepoLinks: (...args: unknown[]) => listProjectGithubRepoLinksMock(...args),
  getProjectGithubMappingCoverage: (...args: unknown[]) => getProjectGithubMappingCoverageMock(...args),
  getLatestProjectGithubSnapshot: (...args: unknown[]) => getLatestProjectGithubSnapshotMock(...args),
  analyseProjectGithubRepo: (...args: unknown[]) => analyseProjectGithubRepoMock(...args),
  listLiveProjectGithubRepoBranchCommits: (...args: unknown[]) =>
    listLiveProjectGithubRepoBranchCommitsMock(...args),
}));

vi.mock("./GithubRepoLinkCard", () => ({
  GithubRepoLinkCard: ({
    link,
    readOnly,
    viewerMode,
  }: {
    link: { repository: { fullName: string } };
    readOnly?: boolean;
    viewerMode?: string;
  }) => (
    <div data-testid="staff-repo-card">
      {link.repository.fullName}:{String(readOnly)}:{viewerMode}
    </div>
  ),
}));

function makeLink(id: number, fullName: string): ProjectGithubRepoLink {
  return {
    id,
    projectId: 1,
    githubRepositoryId: id * 10,
    linkedByUserId: 2,
    isActive: true,
    autoSyncEnabled: true,
    syncIntervalMinutes: 60,
    lastSyncedAt: null,
    nextSyncAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    repository: {
      id: id * 10,
      githubRepoId: id * 1000,
      ownerLogin: "org",
      name: fullName.split("/")[1] || "repo",
      fullName,
      htmlUrl: `https://github.com/${fullName}`,
      isPrivate: false,
      defaultBranch: "main",
      pushedAt: null,
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  };
}

describe("StaffProjectReposReadOnlyClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows empty state when no linked repositories exist", async () => {
    listProjectGithubRepoLinksMock.mockResolvedValue([]);

    render(
      <StaffProjectReposReadOnlyClient
        projectId="1"
        projectName="Small Group Project"
        teamName="Team Alpha"
      />
    );

    expect(await screen.findByText("No repositories are linked to this project yet.")).toBeInTheDocument();
    expect(getProjectGithubMappingCoverageMock).not.toHaveBeenCalled();
    expect(getLatestProjectGithubSnapshotMock).not.toHaveBeenCalled();
  });

  it("renders linked repository cards in read-only staff mode", async () => {
    listProjectGithubRepoLinksMock.mockResolvedValue([makeLink(7, "org/repo-one")]);
    getProjectGithubMappingCoverageMock.mockResolvedValue({
      linkId: 7,
      snapshotId: null,
      analysedAt: null,
      coverage: null,
    });
    getLatestProjectGithubSnapshotMock.mockRejectedValue(new Error("missing snapshot"));

    render(
      <StaffProjectReposReadOnlyClient
        projectId="1"
        projectName="Small Group Project"
        teamName="Team Alpha"
      />
    );

    expect(await screen.findByTestId("staff-repo-card")).toHaveTextContent("org/repo-one:true:staff");
  });

  it("refreshes snapshots for all linked repositories", async () => {
    listProjectGithubRepoLinksMock.mockResolvedValue([makeLink(3, "org/r1"), makeLink(4, "org/r2")]);
    getProjectGithubMappingCoverageMock.mockResolvedValue({
      linkId: 3,
      snapshotId: null,
      analysedAt: null,
      coverage: null,
    });
    getLatestProjectGithubSnapshotMock.mockRejectedValue(new Error("missing snapshot"));
    analyseProjectGithubRepoMock.mockResolvedValue({ snapshot: { id: 1 } });

    render(
      <StaffProjectReposReadOnlyClient
        projectId="1"
        projectName="Small Group Project"
        teamName="Team Alpha"
      />
    );

    await screen.findAllByTestId("staff-repo-card");
    fireEvent.click(screen.getByRole("button", { name: "Refresh snapshots" }));

    await waitFor(() => {
      expect(analyseProjectGithubRepoMock).toHaveBeenCalledWith(3);
      expect(analyseProjectGithubRepoMock).toHaveBeenCalledWith(4);
    });
  });

  it("loads recent commits when commits tab is opened", async () => {
    listProjectGithubRepoLinksMock.mockResolvedValue([makeLink(8, "org/repo-two")]);
    getProjectGithubMappingCoverageMock.mockResolvedValue({
      linkId: 8,
      snapshotId: null,
      analysedAt: null,
      coverage: null,
    });
    getLatestProjectGithubSnapshotMock.mockResolvedValue({
      snapshot: {
        id: 1,
        analysedAt: "2026-02-26T00:00:00.000Z",
        data: null,
        userStats: [],
        repoStats: [],
      },
    });
    listLiveProjectGithubRepoBranchCommitsMock.mockResolvedValue({
      linkId: 8,
      repository: {
        id: 80,
        fullName: "org/repo-two",
        defaultBranch: "main",
        htmlUrl: "https://github.com/org/repo-two",
      },
      branch: "main",
      commits: [
        {
          sha: "abc",
          message: "Initial commit",
          date: "2026-02-26T00:00:00.000Z",
          authorLogin: "alice",
          authorEmail: "alice@example.com",
          additions: 10,
          deletions: 2,
          htmlUrl: "https://github.com/org/repo-two/commit/abc",
        },
      ],
    });

    render(
      <StaffProjectReposReadOnlyClient
        projectId="1"
        projectName="Small Group Project"
        teamName="Team Alpha"
      />
    );

    await screen.findByTestId("staff-repo-card");
    fireEvent.click(screen.getByRole("button", { name: "Recent commits" }));

    await waitFor(() => {
      expect(listLiveProjectGithubRepoBranchCommitsMock).toHaveBeenCalledWith(8, "main", 20);
    });
    expect(await screen.findByText("Initial commit")).toBeInTheDocument();
  });
});
