import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StaffProjectReposReadOnlyClient } from "./StaffProjectReposReadOnlyClient";
import type { ProjectGithubRepoLink } from "../types";

const listProjectGithubRepoLinksMock = vi.fn();
const getProjectGithubMappingCoverageMock = vi.fn();
const getLatestProjectGithubSnapshotMock = vi.fn();
const analyseProjectGithubRepoMock = vi.fn();
const listLiveProjectGithubRepoBranchesMock = vi.fn();
const listLiveProjectGithubRepoBranchCommitsMock = vi.fn();

vi.mock("../api/client", () => ({
  listProjectGithubRepoLinks: (...args: unknown[]) => listProjectGithubRepoLinksMock(...args),
  getProjectGithubMappingCoverage: (...args: unknown[]) => getProjectGithubMappingCoverageMock(...args),
  getLatestProjectGithubSnapshot: (...args: unknown[]) => getLatestProjectGithubSnapshotMock(...args),
  analyseProjectGithubRepo: (...args: unknown[]) => analyseProjectGithubRepoMock(...args),
  listLiveProjectGithubRepoBranches: (...args: unknown[]) => listLiveProjectGithubRepoBranchesMock(...args),
  listLiveProjectGithubRepoBranchCommits: (...args: unknown[]) =>
    listLiveProjectGithubRepoBranchCommitsMock(...args),
}));

vi.mock("./GithubRepoLinkCard", () => ({
  GithubRepoLinkCard: ({
    link,
    readOnly,
    viewerMode,
    chartMode,
    onSelectBranch,
    branchCommits,
  }: {
    link: { repository: { fullName: string } };
    readOnly?: boolean;
    viewerMode?: string;
    chartMode?: string;
    onSelectBranch?: (branchName: string) => void;
    branchCommits?: { commits?: Array<unknown> } | null;
  }) => (
    <div>
      <div data-testid="staff-repo-card">
        {link.repository.fullName}:{String(readOnly)}:{viewerMode}:{chartMode}
      </div>
      <button type="button" onClick={() => onSelectBranch?.("feature/cleanup")}>
        Select feature branch
      </button>
      <div data-testid="staff-branch-commit-count">{branchCommits?.commits?.length ?? 0}</div>
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

  it("renders selected repository analytics card in read-only staff mode", async () => {
    listProjectGithubRepoLinksMock.mockResolvedValue([makeLink(7, "org/repo-one")]);
    getProjectGithubMappingCoverageMock.mockResolvedValue({
      linkId: 7,
      snapshotId: null,
      analysedAt: null,
      coverage: null,
    });
    getLatestProjectGithubSnapshotMock.mockRejectedValue(new Error("missing snapshot"));
    listLiveProjectGithubRepoBranchesMock.mockResolvedValue({
      linkId: 7,
      repository: { id: 70, fullName: "org/repo-one", defaultBranch: "main", htmlUrl: "https://github.com/org/repo-one" },
      branches: [{ name: "main", isDefault: true }],
    });
    listLiveProjectGithubRepoBranchCommitsMock.mockResolvedValue({
      linkId: 7,
      repository: { id: 70, fullName: "org/repo-one", defaultBranch: "main", htmlUrl: "https://github.com/org/repo-one" },
      branch: "main",
      commits: [],
    });

    render(
      <StaffProjectReposReadOnlyClient
        projectId="1"
        projectName="Small Group Project"
        teamName="Team Alpha"
      />
    );

    expect(await screen.findByTestId("staff-repo-card")).toHaveTextContent("org/repo-one:true:staff:team");
    await waitFor(() => {
      expect(listLiveProjectGithubRepoBranchesMock).toHaveBeenCalledWith(7);
    });
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
    listLiveProjectGithubRepoBranchesMock.mockResolvedValue({
      linkId: 3,
      repository: { id: 30, fullName: "org/r1", defaultBranch: "main", htmlUrl: "https://github.com/org/r1" },
      branches: [{ name: "main", isDefault: true }],
    });
    listLiveProjectGithubRepoBranchCommitsMock.mockResolvedValue({
      linkId: 3,
      repository: { id: 30, fullName: "org/r1", defaultBranch: "main", htmlUrl: "https://github.com/org/r1" },
      branch: "main",
      commits: [],
    });
    analyseProjectGithubRepoMock.mockResolvedValue({ snapshot: { id: 1 } });

    render(
      <StaffProjectReposReadOnlyClient
        projectId="1"
        projectName="Small Group Project"
        teamName="Team Alpha"
      />
    );

    await screen.findByTestId("staff-repo-card");
    fireEvent.click(screen.getByRole("button", { name: "Refresh snapshots" }));

    await waitFor(() => {
      expect(analyseProjectGithubRepoMock).toHaveBeenCalledWith(3);
      expect(analyseProjectGithubRepoMock).toHaveBeenCalledWith(4);
    });
  });

  it("loads branch commits and updates when branch changes", async () => {
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

    listLiveProjectGithubRepoBranchesMock.mockResolvedValue({
      linkId: 8,
      repository: {
        id: 80,
        fullName: "org/repo-two",
        defaultBranch: "main",
        htmlUrl: "https://github.com/org/repo-two",
      },
      branches: [
        { name: "main", isDefault: true },
        { name: "feature/cleanup", isDefault: false },
      ],
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
    await waitFor(() => {
      expect(listLiveProjectGithubRepoBranchCommitsMock).toHaveBeenCalledWith(8, "main", 20);
    });
    expect(screen.getByTestId("staff-branch-commit-count")).toHaveTextContent("1");

    fireEvent.click(screen.getByRole("button", { name: "Select feature branch" }));

    await waitFor(() => {
      expect(listLiveProjectGithubRepoBranchCommitsMock).toHaveBeenCalledWith(8, "feature/cleanup", 20);
    });
  });
});
