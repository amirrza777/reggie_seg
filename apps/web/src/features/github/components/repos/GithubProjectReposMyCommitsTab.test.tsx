import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GithubProjectReposMyCommitsTab } from "./GithubProjectReposMyCommitsTab";

vi.mock("@/shared/ui/Table", () => ({
  Table: ({ rows }: { rows: unknown[] }) => <div data-testid="table">{rows.length}</div>,
}));

const styles = {
  panel: {},
  sectionTitleWrap: {},
  sectionKicker: {},
  list: {},
  panelInner: {},
  row: {},
} as any;

function makeProps() {
  return {
    styles,
    loading: false,
    connection: {
      connected: true,
      account: { login: "alice" },
    },
    links: [{ id: 1, repository: { fullName: "team/repo" } }],
    latestSnapshotByLinkId: {
      1: { analysedAt: "2026-02-26T00:00:00.000Z" },
    },
    myCommitsByLinkId: {
      1: {
        page: 2,
        hasNextPage: true,
        totals: {
          commits: 12,
          mergePullRequestCommits: 1,
          additionsExcludingMergePullRequests: 20,
          deletionsExcludingMergePullRequests: 5,
          additionsIncludingMergePullRequests: 24,
          deletionsIncludingMergePullRequests: 7,
          detailedCommitCount: 10,
          requestedCommitCount: 12,
        },
        commits: [
          {
            sha: "abcdef123456",
            message: "feat: x",
            authorLogin: "alice",
            authorEmail: null,
            date: "2026-02-26T00:00:00.000Z",
            additions: 5,
            deletions: 1,
            isMergePullRequest: true,
            htmlUrl: "https://github.com/team/repo/commit/abcdef123456",
          },
        ],
      },
    },
    myCommitsLoadingByLinkId: {},
    myCommitsErrorByLinkId: {},
    fetchMyCommits: vi.fn().mockResolvedValue(undefined),
  } as any;
}

describe("GithubProjectReposMyCommitsTab", () => {
  it("renders totals and commit table and paginates", () => {
    const props = makeProps();
    render(<GithubProjectReposMyCommitsTab {...props} />);

    expect(screen.getByText("My commits")).toBeInTheDocument();
    expect(screen.getByText("team/repo")).toBeInTheDocument();
    expect(screen.getByText(/Showing commits for @alice/)).toBeInTheDocument();
    expect(screen.getByText("Merge PR commits")).toBeInTheDocument();
    expect(screen.queryByText("Lines (no merge PRs)")).not.toBeInTheDocument();
    expect(screen.queryByText("With merges")).not.toBeInTheDocument();
    expect(screen.getByTestId("table")).toHaveTextContent("1");

    fireEvent.click(screen.getByRole("button", { name: "Previous" }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    expect(props.fetchMyCommits).toHaveBeenNthCalledWith(1, 1, 1);
    expect(props.fetchMyCommits).toHaveBeenNthCalledWith(2, 1, 3);
  });

  it("renders connect/link empty states", () => {
    const props = makeProps();
    props.connection = { connected: false, account: null };

    const { rerender } = render(<GithubProjectReposMyCommitsTab {...props} />);
    expect(screen.getByText("Connect GitHub to view your commits.")).toBeInTheDocument();

    props.connection = { connected: true, account: { login: "alice" } };
    props.links = [];
    rerender(<GithubProjectReposMyCommitsTab {...props} />);
    expect(screen.getByText("Link a repository first to view your commits.")).toBeInTheDocument();
  });

  it("renders loading, error, and empty commit states", () => {
    const props = makeProps();
    props.myCommitsByLinkId = { 1: { page: 1, hasNextPage: false, totals: null, commits: [] } };
    props.myCommitsLoadingByLinkId = { 1: true };
    props.myCommitsErrorByLinkId = { 1: "failed loading commits" };

    const { rerender } = render(<GithubProjectReposMyCommitsTab {...props} />);
    expect(screen.getByText("Loading your commits...")).toBeInTheDocument();
    expect(screen.getByText("Failed to load commits: failed loading commits")).toBeInTheDocument();

    props.myCommitsLoadingByLinkId = { 1: false };
    props.myCommitsErrorByLinkId = { 1: null };
    rerender(<GithubProjectReposMyCommitsTab {...props} />);
    expect(screen.getByText("No commits found for your GitHub account in this repository.")).toBeInTheDocument();
  });

  it("falls back commit identity/date rendering and disables pager edges", () => {
    const props = makeProps();
    props.connection = { connected: true, account: null };
    props.myCommitsByLinkId = {
      1: {
        page: 1,
        hasNextPage: false,
        totals: null,
        commits: [
          {
            sha: "abcdef123456",
            message: "",
            authorLogin: null,
            authorEmail: null,
            date: null,
            isMergePullRequest: false,
            htmlUrl: "https://github.com/team/repo/commit/abcdef123456",
          },
        ],
      },
    };

    render(<GithubProjectReposMyCommitsTab {...props} />);
    expect(screen.getByText(/Showing your commits/)).toBeInTheDocument();
    expect(screen.getAllByText("-").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  });
});
