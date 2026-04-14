import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GithubProjectReposBranchesTab } from "./GithubProjectReposBranchesTab";

function makeProps() {
  return {
    loading: false,
    liveBranchesRefreshing: false,
    links: [
      {
        id: 1,
        repository: { fullName: "team/repo", defaultBranch: "main" },
      },
    ] as any[],
    latestSnapshotByLinkId: {
      1: {
        analysedAt: "2026-02-26T00:00:00.000Z",
        data: {
          branchScopeStats: {
            allBranches: {
              commitsByBranch: {
                main: 11,
                "feature/a": 6,
              },
            },
          },
        },
      },
    } as any,
    liveBranchesByLinkId: {
      1: {
        branches: [
          { name: "main", isDefault: true },
          { name: "feature/a", isDefault: false },
        ],
      },
    } as any,
    liveBranchesLoadingByLinkId: {},
    liveBranchesErrorByLinkId: {},
    selectedBranchByLinkId: { 1: "main" },
    branchCommitsByLinkId: {
      1: {
        commits: [
          {
            sha: "abcdef123456",
            message: "feat: add login",
            authorLogin: "alice",
            authorEmail: null,
            date: "2026-02-26T00:00:00.000Z",
            additions: 5,
            deletions: 1,
            htmlUrl: "https://github.com/team/repo/commit/abcdef123456",
          },
        ],
      },
    } as any,
    branchCommitsLoadingByLinkId: {},
    branchCommitsErrorByLinkId: {},
    handleRefreshLiveBranches: vi.fn().mockResolvedValue(undefined),
    getBranchQuery: vi.fn().mockReturnValue(""),
    onBranchQueryChange: vi.fn(),
    onSelectBranch: vi.fn(),
  };
}

describe("GithubProjectReposBranchesTab", () => {
  it("renders dropdown-based branch activity and triggers refresh/select actions", () => {
    const props = makeProps();
    render(<GithubProjectReposBranchesTab {...props} />);

    expect(screen.getByText("Branch commits")).toBeInTheDocument();
    expect(screen.getByText("team/repo")).toBeInTheDocument();
    expect(screen.getByLabelText("Branch")).toBeInTheDocument();
    expect(screen.getByText("feat: add login")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Refresh branches" }));
    fireEvent.change(screen.getByLabelText("Branch"), {
      target: { value: "feature/a" },
    });

    expect(props.handleRefreshLiveBranches).toHaveBeenCalledTimes(1);
    expect(props.onSelectBranch).toHaveBeenCalledWith(1, "feature/a");
  });

  it("renders empty and loading states", () => {
    const props = makeProps();
    props.loading = true;
    props.links = [];

    const { rerender } = render(<GithubProjectReposBranchesTab {...props} />);
    expect(screen.getByText("Loading branch data...")).toBeInTheDocument();

    props.loading = false;
    rerender(<GithubProjectReposBranchesTab {...props} />);
    expect(screen.getByText("No linked repository available.")).toBeInTheDocument();
  });

  it("renders branch/commit loading, error, and empty-result states", () => {
    const props = makeProps();
    props.liveBranchesLoadingByLinkId = { 1: true };
    props.liveBranchesErrorByLinkId = { 1: "branch api failed" };
    props.branchCommitsLoadingByLinkId = { 1: true };
    props.branchCommitsErrorByLinkId = { 1: "commit api failed" };
    props.branchCommitsByLinkId = { 1: { commits: [] } } as any;

    const { rerender } = render(<GithubProjectReposBranchesTab {...props} />);
    expect(screen.getByText("Loading branches...")).toBeInTheDocument();
    expect(screen.getByText("Failed to load branches: branch api failed")).toBeInTheDocument();
    expect(screen.getByText("Loading recent commits...")).toBeInTheDocument();
    expect(screen.getByText("Failed to load commits: commit api failed")).toBeInTheDocument();

    props.liveBranchesLoadingByLinkId = { 1: false };
    props.liveBranchesErrorByLinkId = { 1: null };
    props.liveBranchesByLinkId = { 1: { branches: [] } } as any;
    props.branchCommitsLoadingByLinkId = { 1: false };
    props.branchCommitsErrorByLinkId = { 1: null };
    props.selectedBranchByLinkId = { 1: "main" };
    rerender(<GithubProjectReposBranchesTab {...props} />);

    expect(screen.getByText("No branches returned for this repository.")).toBeInTheDocument();
    expect(screen.getByText("No commits returned for this branch.")).toBeInTheDocument();
  });

  it("falls back commit metadata when optional fields are missing", () => {
    const props = makeProps();
    props.selectedBranchByLinkId = { 1: "feature/a" };
    props.latestSnapshotByLinkId = { 1: null } as any;
    props.branchCommitsByLinkId = {
      1: {
        commits: [
          {
            sha: "1234567890abcdef",
            message: "",
            authorLogin: null,
            authorEmail: null,
            date: null,
            additions: undefined,
            deletions: undefined,
            htmlUrl: "https://github.com/team/repo/commit/1234567890abcdef",
          },
        ],
      },
    } as any;

    render(<GithubProjectReposBranchesTab {...props} />);
    expect(screen.getByText("(no message)")).toBeInTheDocument();
    expect(screen.getByText(/unknown/)).toBeInTheDocument();
    expect(screen.getByText("Unknown date")).toBeInTheDocument();
    expect(screen.queryByText(/\+\d+ \/ -\d+/)).not.toBeInTheDocument();
  });
});
