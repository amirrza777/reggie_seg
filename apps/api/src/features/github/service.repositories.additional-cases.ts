import { expect, it, vi } from "vitest";
import { GithubServiceError } from "./errors.js";

type ServiceRepositoriesExtraContext = {
  disconnectGithubAccount: (userId: number) => Promise<unknown>;
  getGithubConnectionStatus: (userId: number) => Promise<unknown>;
  linkGithubRepositoryToProject: (userId: number, input: Record<string, unknown>) => Promise<unknown>;
  listGithubRepositoriesForUser: (userId: number, filters?: { query?: string }) => Promise<any[]>;
  listProjectGithubRepositories: (userId: number, projectId: number) => Promise<unknown>;
  mockFetchResponse: (body: unknown, status?: number) => any;
  mockInstalledRepos: (githubRepoIds: number[]) => ReturnType<typeof vi.fn>;
  repoMocks: any;
  analysisMocks: any;
};

export function registerServiceRepositoriesExtraTests(ctx: ServiceRepositoriesExtraContext) {
  it("caps user repository pagination after page 11 when pages stay full", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("/user/installations?")) {
        return ctx.mockFetchResponse({ installations: [] });
      }
      if (url.includes("/user/repos")) {
        const page = Number(new URL(url).searchParams.get("page"));
        if (page >= 1 && page <= 11) {
          return ctx.mockFetchResponse(
            Array.from({ length: 100 }, (_, i) => ({
              id: page * 1000 + i,
              name: `repo-${page}-${i}`,
              full_name: `org/repo-${page}-${i}`,
              html_url: `https://github.com/org/repo-${page}-${i}`,
              private: false,
              default_branch: "main",
              owner: { login: "org" },
            })),
          );
        }
        return ctx.mockFetchResponse([]);
      }
      return ctx.mockFetchResponse({}, 404);
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await ctx.listGithubRepositoriesForUser(10);
    expect(result.length).toBe(1000);

    const calledUrls = fetchMock.mock.calls.map((call) => String(call[0]));
    expect(calledUrls.some((url) => url.includes("/user/repos") && url.includes("page=10"))).toBe(true);
    expect(calledUrls.some((url) => url.includes("/user/repos") && url.includes("page=11"))).toBe(false);
  });

  it("skips installations that return 403/404 when listing installation repositories", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("/user/repos")) return ctx.mockFetchResponse([]);
      if (url.includes("/user/installations?")) return ctx.mockFetchResponse({ installations: [{ id: 101 }, { id: 102 }] });
      if (url.includes("/user/installations/101/repositories")) return ctx.mockFetchResponse({}, 403);
      if (url.includes("/user/installations/102/repositories")) return ctx.mockFetchResponse({}, 404);
      return ctx.mockFetchResponse({}, 404);
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(ctx.listGithubRepositoriesForUser(10)).resolves.toEqual([]);
  });

  it("caps installation repository pagination at 10 pages when each page stays full", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("/user/repos")) return ctx.mockFetchResponse([]);
      if (url.includes("/user/installations?")) return ctx.mockFetchResponse({ installations: [{ id: 101 }] });
      if (url.includes("/user/installations/101/repositories")) {
        const page = Number(new URL(url).searchParams.get("page"));
        if (page >= 1 && page <= 10) {
          return ctx.mockFetchResponse({
            repositories: Array.from({ length: 100 }, (_, index) => ({
              id: page * 1000 + index,
              name: `repo-${page}-${index}`,
              full_name: `org/repo-${page}-${index}`,
              html_url: `https://github.com/org/repo-${page}-${index}`,
              private: false,
              default_branch: "main",
              owner: { login: "org" },
            })),
          });
        }
        return ctx.mockFetchResponse({ repositories: [] });
      }
      return ctx.mockFetchResponse({}, 404);
    });
    vi.stubGlobal("fetch", fetchMock);

    const repositories = await ctx.listGithubRepositoriesForUser(10);
    expect(repositories).toHaveLength(1000);

    const calledUrls = fetchMock.mock.calls.map((call) => String(call[0]));
    expect(
      calledUrls.some((url) => url.includes("/user/installations/101/repositories") && url.includes("page=10")),
    ).toBe(true);
    expect(
      calledUrls.some((url) => url.includes("/user/installations/101/repositories") && url.includes("page=11")),
    ).toBe(false);
  });

  it("caps installation pagination at five pages when each installations page stays full", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("/user/repos")) return ctx.mockFetchResponse([]);
      if (url.includes("/user/installations?")) {
        const page = Number(new URL(url).searchParams.get("page"));
        if (page >= 1 && page <= 5) {
          return ctx.mockFetchResponse({
            installations: Array.from({ length: 100 }, (_, index) => ({ id: page * 1000 + index })),
          });
        }
        return ctx.mockFetchResponse({ installations: [] });
      }
      if (url.includes("/user/installations/")) return ctx.mockFetchResponse({}, 404);
      return ctx.mockFetchResponse({}, 404);
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(ctx.listGithubRepositoriesForUser(10)).resolves.toEqual([]);

    const calledUrls = fetchMock.mock.calls.map((call) => String(call[0]));
    expect(calledUrls.some((url) => url.includes("/user/installations?") && url.includes("page=5"))).toBe(true);
    expect(calledUrls.some((url) => url.includes("/user/installations?") && url.includes("page=6"))).toBe(false);
  });

  it("lists linked project repositories for project members", async () => {
    ctx.repoMocks.isUserInProject.mockResolvedValue(true);
    ctx.repoMocks.listProjectGithubRepositoryLinks.mockResolvedValue([{ id: 1 }, { id: 2 }]);

    await expect(ctx.listProjectGithubRepositories(3, 99)).resolves.toEqual([{ id: 1 }, { id: 2 }]);
    expect(ctx.repoMocks.listProjectGithubRepositoryLinks).toHaveBeenCalledWith(99);
  });

  it("links a repository and auto-analyses a snapshot on success", async () => {
    const fetchMock = ctx.mockInstalledRepos([123]);
    ctx.repoMocks.isUserInProject.mockResolvedValue(true);
    ctx.repoMocks.findActiveProjectGithubRepositoryLink.mockResolvedValue(null);
    ctx.repoMocks.upsertGithubRepository.mockResolvedValue({ id: 77, fullName: "team/repo" });
    ctx.repoMocks.upsertProjectGithubRepositoryLink.mockResolvedValue({ id: 55 });
    ctx.analysisMocks.analyseProjectGithubRepository.mockResolvedValue({ id: 99 });

    const result = await ctx.linkGithubRepositoryToProject(10, {
      projectId: 1,
      githubRepoId: 123,
      name: "repo",
      fullName: "team/repo",
      htmlUrl: "https://github.com/team/repo",
      isPrivate: false,
      ownerLogin: "team",
      defaultBranch: "main",
    });

    expect(ctx.repoMocks.upsertGithubRepository).toHaveBeenCalledWith(
      expect.objectContaining({ githubRepoId: BigInt(123), fullName: "team/repo" })
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(ctx.repoMocks.upsertProjectGithubRepositoryLink).toHaveBeenCalledWith(1, 77, 10);
    expect(ctx.analysisMocks.analyseProjectGithubRepository).toHaveBeenCalledWith(10, 55);
    expect(result).toEqual({
      link: { id: 55 },
      repository: { id: 77, fullName: "team/repo" },
      snapshot: { id: 99 },
    });
  });

  it("blocks linking when the user is not a member of the project", async () => {
    ctx.repoMocks.isUserInProject.mockResolvedValue(false);

    await expect(
      ctx.linkGithubRepositoryToProject(10, {
        projectId: 1,
        githubRepoId: 123,
        name: "repo",
        fullName: "team/repo",
        htmlUrl: "https://github.com/team/repo",
        isPrivate: false,
        ownerLogin: "team",
        defaultBranch: "main",
      }),
    ).rejects.toEqual(new GithubServiceError(403, "You are not a member of this project"));
  });

  it("blocks linking when no GitHub account is connected", async () => {
    ctx.repoMocks.isUserInProject.mockResolvedValue(true);
    ctx.repoMocks.findGithubAccountByUserId.mockResolvedValue(null);

    await expect(
      ctx.linkGithubRepositoryToProject(10, {
        projectId: 1,
        githubRepoId: 123,
        name: "repo",
        fullName: "team/repo",
        htmlUrl: "https://github.com/team/repo",
        isPrivate: false,
        ownerLogin: "team",
        defaultBranch: "main",
      }),
    ).rejects.toEqual(new GithubServiceError(404, "GitHub account is not connected"));
  });

  it("blocks linking when a project already has an active repository link", async () => {
    ctx.mockInstalledRepos([123]);
    ctx.repoMocks.isUserInProject.mockResolvedValue(true);
    ctx.repoMocks.findActiveProjectGithubRepositoryLink.mockResolvedValue({
      repository: { fullName: "team/existing" },
    });

    await expect(
      ctx.linkGithubRepositoryToProject(10, {
        projectId: 1,
        githubRepoId: 123,
        name: "repo",
        fullName: "team/repo",
        htmlUrl: "https://github.com/team/repo",
        isPrivate: false,
        ownerLogin: "team",
        defaultBranch: "main",
      }),
    ).rejects.toEqual(
      new GithubServiceError(
        409,
        "This project already has a linked repository (team/existing). Remove it before linking another one.",
      ),
    );
  });

  it("rolls back the fresh link when auto-analysis fails", async () => {
    ctx.mockInstalledRepos([123]);
    ctx.repoMocks.isUserInProject.mockResolvedValue(true);
    ctx.repoMocks.findActiveProjectGithubRepositoryLink.mockResolvedValue(null);
    ctx.repoMocks.upsertGithubRepository.mockResolvedValue({ id: 77, fullName: "team/repo" });
    ctx.repoMocks.upsertProjectGithubRepositoryLink.mockResolvedValue({ id: 55 });
    ctx.analysisMocks.analyseProjectGithubRepository.mockRejectedValue(new Error("boom"));

    await expect(
      ctx.linkGithubRepositoryToProject(10, {
        projectId: 1,
        githubRepoId: 123,
        name: "repo",
        fullName: "team/repo",
        htmlUrl: "https://github.com/team/repo",
        isPrivate: false,
        ownerLogin: "team",
        defaultBranch: "main",
      })
    ).rejects.toEqual(new GithubServiceError(502, "Repository linked but analysis failed. Please try linking again."));

    expect(ctx.repoMocks.deactivateProjectGithubRepositoryLink).toHaveBeenCalledWith(55);
  });

  it("rethrows GithubServiceError from analysis after rollback", async () => {
    ctx.mockInstalledRepos([123]);
    ctx.repoMocks.isUserInProject.mockResolvedValue(true);
    ctx.repoMocks.findActiveProjectGithubRepositoryLink.mockResolvedValue(null);
    ctx.repoMocks.upsertGithubRepository.mockResolvedValue({ id: 77, fullName: "team/repo" });
    ctx.repoMocks.upsertProjectGithubRepositoryLink.mockResolvedValue({ id: 55 });
    const analysisError = new GithubServiceError(502, "analysis failed");
    ctx.analysisMocks.analyseProjectGithubRepository.mockRejectedValueOnce(analysisError);

    await expect(
      ctx.linkGithubRepositoryToProject(10, {
        projectId: 1,
        githubRepoId: 123,
        name: "repo",
        fullName: "team/repo",
        htmlUrl: "https://github.com/team/repo",
        isPrivate: false,
        ownerLogin: "team",
        defaultBranch: "main",
      }),
    ).rejects.toBe(analysisError);

    expect(ctx.repoMocks.deactivateProjectGithubRepositoryLink).toHaveBeenCalledWith(55);
  });

  it("blocks linking when app access to the selected repository is missing", async () => {
    ctx.mockInstalledRepos([999]);
    ctx.repoMocks.isUserInProject.mockResolvedValue(true);

    await expect(
      ctx.linkGithubRepositoryToProject(10, {
        projectId: 1,
        githubRepoId: 123,
        name: "repo",
        fullName: "team/repo",
        htmlUrl: "https://github.com/team/repo",
        isPrivate: false,
        ownerLogin: "team",
        defaultBranch: "main",
      })
    ).rejects.toEqual(
      new GithubServiceError(
        409,
        "GitHub App does not have access to this repository yet. Ask the owner or organization admin to grant access, then refresh."
      )
    );

    expect(ctx.repoMocks.upsertGithubRepository).not.toHaveBeenCalled();
    expect(ctx.repoMocks.upsertProjectGithubRepositoryLink).not.toHaveBeenCalled();
  });
}
