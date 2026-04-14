import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { GithubProjectReposClient } from "./GithubProjectReposClient";
import {
  analyseProjectGithubRepo,
  disconnectGithubAccount,
  getGithubConnectUrl,
  getGithubConnectionStatus,
  getLatestProjectGithubSnapshot,
  getProjectGithubMappingCoverage,
  linkGithubRepositoryToProject,
  listGithubRepositories,
  listProjectGithubRepoLinks,
  removeProjectGithubRepoLink,
} from "../../api/client";

vi.mock("@/shared/lib/search", () => ({
  SEARCH_DEBOUNCE_MS: 0,
}));

let workspaceCanEdit = true;

vi.mock("@/features/projects/workspace/ProjectWorkspaceCanEditContext", () => ({
  useProjectWorkspaceCanEdit: () => ({ canEdit: workspaceCanEdit }),
}));

vi.mock("./hooks/useGithubProjectReposAutoRefresh", () => ({
  useGithubProjectReposAutoRefresh: vi.fn(),
}));

vi.mock("./hooks/useGithubProjectReposLiveData", () => ({
  useGithubProjectReposLiveData: () => ({
    liveBranchesByLinkId: {},
    liveBranchesLoadingByLinkId: {},
    liveBranchesErrorByLinkId: {},
    liveBranchesRefreshing: false,
    selectedBranchByLinkId: {},
    setSelectedBranchByLinkId: vi.fn(),
    branchCommitsByLinkId: {},
    branchCommitsLoadingByLinkId: {},
    branchCommitsErrorByLinkId: {},
    fetchBranchCommits: vi.fn(),
    handleRefreshLiveBranches: vi.fn(),
    myCommitsByLinkId: {},
    myCommitsLoadingByLinkId: {},
    myCommitsErrorByLinkId: {},
    fetchMyCommits: vi.fn(),
  }),
}));

vi.mock("@/shared/ui/PageSection", () => ({
  PageSection: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  ),
}));

vi.mock("./GithubProjectReposHero", () => ({
  GithubProjectReposHero: () => <div data-testid="repos-hero" />,
}));

vi.mock("./GithubProjectReposMyCommitsTab", () => ({
  GithubProjectReposMyCommitsTab: () => <div data-testid="my-commits-tab" />,
}));

vi.mock("./GithubProjectReposClient.sections", () => ({
  GithubProjectReposClientStatusMessages: ({ info, error }: { info: string | null; error: string | null }) => (
    <div>
      {info ? <p>{info}</p> : null}
      {error ? <p>{error}</p> : null}
    </div>
  ),
  GithubProjectReposClientTabNav: ({ onChange }: { onChange: (tab: "team-code-activity" | "my-code-activity" | "my-commits") => void }) => (
    <div>
      <button type="button" onClick={() => onChange("team-code-activity")}>activate-team-tab</button>
      <button type="button" onClick={() => onChange("my-code-activity")}>activate-my-code-tab</button>
      <button type="button" onClick={() => onChange("my-commits")}>activate-my-commits-tab</button>
    </div>
  ),
  GithubProjectReposMyCodeActivitySection: () => <div data-testid="my-code-tab" />,
  GithubProjectReposTeamCodeActivitySection: (props: {
    onConnect: () => Promise<void>;
    onDisconnect: () => Promise<void>;
    onInstallGithubApp: () => void;
    repositoriesTabProps: {
      onLinkSelected: () => Promise<void>;
      onRemoveLink: (linkId: number) => void;
      onRefresh: () => Promise<void>;
      onRepoSearchQueryChange: (query: string) => void;
      setSelectedRepoId: (repoId: string) => void;
      selectedRepoId: string;
    };
  }) => (
    <div data-testid="team-section">
      <button type="button" onClick={() => void props.onConnect()}>connect</button>
      <button type="button" onClick={() => void props.onDisconnect()}>disconnect</button>
      <button type="button" onClick={props.onInstallGithubApp}>install-app</button>
      <button type="button" onClick={() => props.repositoriesTabProps.setSelectedRepoId("")}>select-empty</button>
      <button type="button" onClick={() => props.repositoriesTabProps.setSelectedRepoId("999")}>select-uninstalled</button>
      <button type="button" onClick={() => props.repositoriesTabProps.setSelectedRepoId("555")}>select-installed</button>
      <button type="button" onClick={() => void props.repositoriesTabProps.onLinkSelected()}>link-selected</button>
      <button type="button" onClick={() => props.repositoriesTabProps.onRemoveLink(101)}>remove-link</button>
      <button type="button" onClick={() => void props.repositoriesTabProps.onRefresh()}>refresh-snapshot</button>
      <button type="button" onClick={() => props.repositoriesTabProps.onRepoSearchQueryChange("repo")}>search-repos</button>
      <div data-testid="selected-repo-id">{props.repositoriesTabProps.selectedRepoId}</div>
    </div>
  ),
}));

vi.mock("../../api/client", () => ({
  analyseProjectGithubRepo: vi.fn(),
  disconnectGithubAccount: vi.fn(),
  getGithubConnectUrl: vi.fn(),
  getGithubConnectionStatus: vi.fn(),
  getLatestProjectGithubSnapshot: vi.fn(),
  getProjectGithubMappingCoverage: vi.fn(),
  linkGithubRepositoryToProject: vi.fn(),
  listGithubRepositories: vi.fn(),
  listProjectGithubRepoLinks: vi.fn(),
  removeProjectGithubRepoLink: vi.fn(),
}));

const getGithubConnectionStatusMock = vi.mocked(getGithubConnectionStatus);
const listProjectGithubRepoLinksMock = vi.mocked(listProjectGithubRepoLinks);
const listGithubRepositoriesMock = vi.mocked(listGithubRepositories);
const getProjectGithubMappingCoverageMock = vi.mocked(getProjectGithubMappingCoverage);
const getLatestProjectGithubSnapshotMock = vi.mocked(getLatestProjectGithubSnapshot);
const getGithubConnectUrlMock = vi.mocked(getGithubConnectUrl);
const disconnectGithubAccountMock = vi.mocked(disconnectGithubAccount);
const linkGithubRepositoryToProjectMock = vi.mocked(linkGithubRepositoryToProject);
const removeProjectGithubRepoLinkMock = vi.mocked(removeProjectGithubRepoLink);
const analyseProjectGithubRepoMock = vi.mocked(analyseProjectGithubRepo);

const originalLocation = window.location;

beforeAll(() => {
  const locationMock: Pick<Location, "href" | "origin" | "pathname" | "search" | "assign"> = {
    href: "http://localhost:3001/staff/repos",
    origin: "http://localhost:3001",
    pathname: "/staff/repos",
    search: "",
    assign: vi.fn(),
  };
  Object.defineProperty(window, "location", {
    value: locationMock,
    writable: true,
  });
});

afterAll(() => {
  Object.defineProperty(window, "location", {
    value: originalLocation,
  });
});

function makeLink() {
  return {
    id: 101,
    isActive: true,
    repository: {
      githubRepoId: 555,
      fullName: "org/repo",
      name: "repo",
      htmlUrl: "https://github.com/org/repo",
      isPrivate: false,
      ownerLogin: "org",
      defaultBranch: "main",
    },
  } as any;
}

describe("GithubProjectReposClient behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    workspaceCanEdit = true;
    process.env.NEXT_PUBLIC_GITHUB_APP_INSTALL_URL = "";

    getGithubConnectionStatusMock.mockResolvedValue({
      connected: true,
      account: { login: "ayan" },
    } as any);
    listProjectGithubRepoLinksMock.mockResolvedValue([makeLink()] as any);
    listGithubRepositoriesMock.mockResolvedValue([
      {
        githubRepoId: 555,
        name: "repo",
        fullName: "org/repo",
        htmlUrl: "https://github.com/org/repo",
        isPrivate: false,
        ownerLogin: "org",
        isAppInstalled: true,
        defaultBranch: "main",
      },
      {
        githubRepoId: 999,
        name: "blocked",
        fullName: "org/blocked",
        htmlUrl: "https://github.com/org/blocked",
        isPrivate: true,
        ownerLogin: "org",
        isAppInstalled: false,
        defaultBranch: "main",
      },
    ] as any);
    getProjectGithubMappingCoverageMock.mockResolvedValue({} as any);
    getLatestProjectGithubSnapshotMock.mockResolvedValue({ snapshot: null } as any);
    getGithubConnectUrlMock.mockResolvedValue({ url: "https://github.test/connect" } as any);
    disconnectGithubAccountMock.mockResolvedValue({ disconnected: true } as any);
    linkGithubRepositoryToProjectMock.mockResolvedValue({} as any);
    removeProjectGithubRepoLinkMock.mockResolvedValue({ removed: true } as any);
    analyseProjectGithubRepoMock.mockResolvedValue({} as any);
  });

  it("handles invalid project ids", async () => {
    render(<GithubProjectReposClient projectId="invalid" />);
    await waitFor(() => expect(screen.getByText("Invalid project id.")).toBeInTheDocument());
    expect(listProjectGithubRepoLinksMock).not.toHaveBeenCalled();
  });

  it("renders archived read-only empty state when no links are connected", async () => {
    workspaceCanEdit = false;
    getGithubConnectionStatusMock.mockResolvedValueOnce({ connected: false, account: null } as any);
    listProjectGithubRepoLinksMock.mockResolvedValueOnce([] as any);

    render(<GithubProjectReposClient projectId="1" />);

    await waitFor(() =>
      expect(screen.getByText("No repository was connected to this team before the project was archived.")).toBeInTheDocument(),
    );
  });

  it("executes connect/install/link/remove/refresh handlers and exposes error states", async () => {
    render(<GithubProjectReposClient projectId="1" />);
    await waitFor(() => expect(screen.getByTestId("team-section")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "activate-my-code-tab" }));
    expect(screen.getByTestId("my-code-tab")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "activate-my-commits-tab" }));
    expect(screen.getByTestId("my-commits-tab")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "activate-team-tab" }));
    await waitFor(() => expect(screen.getByTestId("team-section")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "connect" }));
    await waitFor(() => expect(getGithubConnectUrlMock).toHaveBeenCalled());
    expect(window.location.href).toBe("https://github.test/connect");

    disconnectGithubAccountMock.mockRejectedValueOnce(new Error("disconnect failed"));
    fireEvent.click(screen.getByRole("button", { name: "disconnect" }));
    await waitFor(() => expect(screen.getByText("disconnect failed")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "install-app" }));
    expect(screen.getByText("GitHub App install URL is not configured.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "select-empty" }));
    fireEvent.click(screen.getByRole("button", { name: "link-selected" }));
    expect(screen.getByText("Select a repository to link.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "select-uninstalled" }));
    fireEvent.click(screen.getByRole("button", { name: "link-selected" }));
    expect(screen.getByText(/does not have access to this repository yet/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "select-installed" }));
    fireEvent.click(screen.getByRole("button", { name: "link-selected" }));
    await waitFor(() => expect(linkGithubRepositoryToProjectMock).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: "remove-link" }));
    await waitFor(() => expect(removeProjectGithubRepoLinkMock).toHaveBeenCalledWith(101));

    fireEvent.click(screen.getByRole("button", { name: "refresh-snapshot" }));
    await waitFor(() => expect(analyseProjectGithubRepoMock).toHaveBeenCalledWith(101));

    fireEvent.click(screen.getByRole("button", { name: "search-repos" }));
    await waitFor(() => expect(listGithubRepositoriesMock).toHaveBeenCalledWith({ query: "repo" }));
  });
});
