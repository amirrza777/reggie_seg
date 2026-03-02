import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GithubProjectReposBranchesTab } from "./GithubProjectReposBranchesTab";

vi.mock("@/shared/ui/Table", () => ({
  Table: ({ headers, rows }: { headers: string[]; rows: unknown[] }) => (
    <div data-testid="table">
      <span>{headers.join(" | ")}</span>
      <span>{rows.length}</span>
    </div>
  ),
}));

const styles = {
  panel: {},
  sectionHeader: {},
  sectionTitleWrap: {},
  sectionKicker: {},
  list: {},
  row: {},
  select: {},
} as const;

function makeProps() {
  return {
    styles,
    loading: false,
    liveBranchesRefreshing: false,
    links: [
      {
        id: 1,
        repository: { fullName: "team/repo", defaultBranch: "main" },
      },
    ] as any[],
    latestSnapshotByLinkId: {
      1: { analysedAt: "2026-02-26T00:00:00.000Z" },
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
    buildBranchRows: vi.fn().mockReturnValue([["main", "Yes", 10, 0, 0, "identical"]]),
    handleRefreshLiveBranches: vi.fn().mockResolvedValue(undefined),
    onSelectBranch: vi.fn(),
  };
}

describe("GithubProjectReposBranchesTab", () => {
  it("renders branch tables and triggers refresh/select actions", () => {
    const props = makeProps();
    render(<GithubProjectReposBranchesTab {...props} />);

    expect(screen.getByText("Branches")).toBeInTheDocument();
    expect(screen.getByText("team/repo")).toBeInTheDocument();
    expect(screen.getAllByTestId("table").length).toBe(2);

    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    fireEvent.change(screen.getByLabelText("Select branch to view 10 most recent commits"), {
      target: { value: "feature/a" },
    });

    expect(props.handleRefreshLiveBranches).toHaveBeenCalledTimes(1);
    expect(props.onSelectBranch).toHaveBeenCalledWith(1, "feature/a");
  });

  it("renders empty/loading/error states", () => {
    const props = makeProps();
    props.loading = true;
    props.links = [];

    const { rerender } = render(<GithubProjectReposBranchesTab {...props} />);
    expect(screen.getByText("Loading branch data...")).toBeInTheDocument();

    props.loading = false;
    rerender(<GithubProjectReposBranchesTab {...props} />);
    expect(screen.getByText("No linked repository available.")).toBeInTheDocument();
  });
});

