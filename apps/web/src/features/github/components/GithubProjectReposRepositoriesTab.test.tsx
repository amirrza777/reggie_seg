import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GithubProjectReposRepositoriesTab } from "./GithubProjectReposRepositoriesTab";

vi.mock("./GithubRepoLinkCard", () => ({
  GithubRepoLinkCard: ({ link }: { link: { repository: { fullName: string } } }) => (
    <div data-testid="repo-link-card">{link.repository.fullName}</div>
  ),
}));

const styles = {
  panel: {},
  sectionHeader: {},
  sectionTitleWrap: {},
  sectionKicker: {},
  list: {},
  select: {},
} as const;

function baseProps() {
  return {
    styles,
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
      },
    ],
    selectedRepoId: "1",
    setSelectedRepoId: vi.fn(),
    coverageByLinkId: {},
    latestSnapshotByLinkId: {},
    currentGithubLogin: "alice",
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
    fireEvent.change(screen.getByLabelText("Select repository to link"), { target: { value: "1" } });
    fireEvent.click(screen.getByRole("button", { name: "Link selected repository" }));

    expect(props.onRefresh).toHaveBeenCalledTimes(1);
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
  });
});

