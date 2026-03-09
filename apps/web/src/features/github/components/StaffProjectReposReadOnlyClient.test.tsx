import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { StaffProjectReposReadOnlyClient } from "./StaffProjectReposReadOnlyClient";
import type { ProjectGithubRepoLink } from "../types";

const listProjectGithubRepoLinksMock = vi.fn();
const getProjectGithubMappingCoverageMock = vi.fn();
const getLatestProjectGithubSnapshotMock = vi.fn();
const analyseProjectGithubRepoMock = vi.fn();

vi.mock("../api/client", () => ({
  listProjectGithubRepoLinks: (...args: unknown[]) => listProjectGithubRepoLinksMock(...args),
  getProjectGithubMappingCoverage: (...args: unknown[]) => getProjectGithubMappingCoverageMock(...args),
  getLatestProjectGithubSnapshot: (...args: unknown[]) => getLatestProjectGithubSnapshotMock(...args),
  analyseProjectGithubRepo: (...args: unknown[]) => analyseProjectGithubRepoMock(...args),
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
});

