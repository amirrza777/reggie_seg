import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GithubProjectReposRepositoriesTab } from "./GithubProjectReposRepositoriesTab";

vi.mock("../GithubRepoLinkCard", () => ({
  GithubRepoLinkCard: ({
    link,
    onSelectBranch,
    onRefreshBranches,
    onRemoveLink,
  }: {
    link: { id: number; repository: { fullName: string } };
    onSelectBranch?: (branchName: string) => void;
    onRefreshBranches?: () => void;
    onRemoveLink?: (linkId: number) => void;
  }) => (
    <>
      <div data-testid="repo-link-card">{link.repository.fullName}</div>
      <button type="button" onClick={() => onSelectBranch?.("feature/demo")}>Select branch</button>
      <button type="button" onClick={() => onRefreshBranches?.()}>Refresh branches</button>
      <button type="button" onClick={() => onRemoveLink?.(link.id)}>Remove linked repo</button>
    </>
  ),
}));

function baseProps() {
  return {
    loading: false,
    busy: false,
    linking: false,
    connection: { connected: true, account: null },
    links: [] as any[],
    availableRepos: [
      {
        githubRepoId: 1,
        name: "repo",
        fullName: "team/repo",
        htmlUrl: "https://github.com/team/repo",
        isPrivate: false,
        ownerLogin: "team",
        defaultBranch: "main",
        isAppInstalled: true,
      },
    ],
    selectedRepoId: "1",
    repoSearchQuery: "",
    onRepoSearchQueryChange: vi.fn(),
    searchingRepos: false,
    setSelectedRepoId: vi.fn(),
    coverageByLinkId: {},
    latestSnapshotByLinkId: {},
    currentGithubLogin: "alice",
    setSelectedBranchByLinkId: vi.fn(),
    onRefreshBranches: vi.fn().mockResolvedValue(undefined),
    onFetchBranchCommits: vi.fn().mockResolvedValue(undefined),
    removingLinkId: null,
    onRefresh: vi.fn().mockResolvedValue(undefined),
    onLinkSelected: vi.fn().mockResolvedValue(undefined),
    onRemoveLink: vi.fn(),
  };
}

describe("GithubProjectReposRepositoriesTab", () => {
  it("renders link controls when connected and no repository is linked", () => {
    const props = baseProps();
    render(<GithubProjectReposRepositoriesTab {...props} />);

    expect(screen.getByText("Linked repositories")).toBeInTheDocument();
    expect(screen.getByLabelText("Select repository to link")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Link selected repository" })).toBeEnabled();
    expect(screen.getByText("No repositories linked to this project yet.")).toBeInTheDocument();
  });

  it("calls refresh and link handlers and propagates select changes", () => {
    const props = baseProps();
    render(<GithubProjectReposRepositoriesTab {...props} />);

    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    fireEvent.change(screen.getByLabelText("Search repositories to link"), { target: { value: "team/repo" } });
    fireEvent.change(screen.getByLabelText("Select repository to link"), { target: { value: "1" } });
    fireEvent.click(screen.getByRole("button", { name: "Link selected repository" }));

    expect(props.onRefresh).toHaveBeenCalledTimes(1);
    expect(props.onRepoSearchQueryChange).toHaveBeenCalledWith("team/repo");
    expect(props.setSelectedRepoId).toHaveBeenCalledWith("1");
    expect(props.onLinkSelected).toHaveBeenCalledTimes(1);
  });

  it("renders existing linked repositories and blocks linking another", () => {
    const props = baseProps();
    props.links = [
      {
        id: 9,
        repository: { fullName: "team/already-linked" },
      } as any,
    ];

    render(<GithubProjectReposRepositoriesTab {...props} />);

    expect(
      screen.getByText("This project already has a linked repository. Remove it before linking another one.")
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Select repository to link")).not.toBeInTheDocument();
    expect(screen.getByTestId("repo-link-card")).toHaveTextContent("team/already-linked");

    fireEvent.click(screen.getByRole("button", { name: "Select branch" }));
    fireEvent.click(screen.getByRole("button", { name: "Refresh branches" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove linked repo" }));
    expect(props.setSelectedBranchByLinkId).toHaveBeenCalledWith(expect.any(Function));
    expect(props.onFetchBranchCommits).toHaveBeenCalledWith(9, "feature/demo");
    expect(props.onRefreshBranches).toHaveBeenCalled();
    expect(props.onRemoveLink).toHaveBeenCalledWith(9);
  });

  it("disables linking when selected repository needs app access", () => {
    const props = baseProps();
    props.availableRepos = [
      {
        githubRepoId: 2,
        name: "repo-collab",
        fullName: "org/repo-collab",
        htmlUrl: "https://github.com/org/repo-collab",
        isPrivate: true,
        ownerLogin: "org",
        defaultBranch: "main",
        isAppInstalled: false,
      },
    ];
    props.selectedRepoId = "2";

    render(<GithubProjectReposRepositoriesTab {...props} />);

    expect(screen.getByRole("button", { name: "Link selected repository" })).toBeDisabled();
    expect(screen.getByText("GitHub App access is required before this repository can be linked.")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Some repositories are visible through collaboration access, but need GitHub App installation access before linking."
      )
    ).toBeInTheDocument();
  });

  it("renders no-match and loading options when repository search has no results", () => {
    const props = baseProps();
    props.selectedRepoId = "";
    props.repoSearchQuery = "zzz";
    props.onRepoSearchQueryChange = vi.fn();
    props.availableRepos = [];
    props.searchingRepos = false;

    const { rerender } = render(<GithubProjectReposRepositoriesTab {...props} />);
    expect(screen.getByText('No repositories match "zzz"')).toBeInTheDocument();

    props.searchingRepos = true;
    props.availableRepos = [
      {
        githubRepoId: 9,
        name: "repo-a",
        fullName: "team/repo-a",
        htmlUrl: "https://github.com/team/repo-a",
        isPrivate: true,
        ownerLogin: "team",
        defaultBranch: "main",
        isAppInstalled: true,
      },
    ];
    rerender(<GithubProjectReposRepositoriesTab {...props} />);
    expect(screen.getByText("Searching repositories...")).toBeInTheDocument();
  });

  it("hides management controls in read-only mode", () => {
    const props = baseProps();
    props.readOnlyWorkspace = true;
    props.links = [{ id: 4, repository: { fullName: "team/readonly" } } as any];

    render(<GithubProjectReposRepositoriesTab {...props} />);
    expect(screen.queryByRole("button", { name: "Refresh" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Select repository to link")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remove linked repo" }));
    expect(props.onRemoveLink).not.toHaveBeenCalled();
  });

  it("renders loading skeleton state", () => {
    const props = baseProps();
    props.loading = true;
    render(<GithubProjectReposRepositoriesTab {...props} />);

    expect(screen.getByText("Loading repositories...")).toBeInTheDocument();
  });

  it("falls back to optional default branch handlers when branch callbacks are omitted", () => {
    const props = baseProps();
    props.links = [{ id: 12, repository: { fullName: "team/defaults" } } as any];
    delete (props as Partial<typeof props>).setSelectedBranchByLinkId;
    delete (props as Partial<typeof props>).onRefreshBranches;
    delete (props as Partial<typeof props>).onFetchBranchCommits;

    render(<GithubProjectReposRepositoriesTab {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Select branch" }));
    fireEvent.click(screen.getByRole("button", { name: "Refresh branches" }));

    expect(screen.getByTestId("repo-link-card")).toHaveTextContent("team/defaults");
  });
});
