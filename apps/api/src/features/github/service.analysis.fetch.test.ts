import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GithubServiceError } from "./errors.js";

const cacheMocks = vi.hoisted(() => ({
  getCachedCommitStats: vi.fn(),
  setCachedCommitStats: vi.fn(),
}));

vi.mock("./config.js", () => ({
  getGitHubApiConfig: () => ({ baseUrl: "https://api.github.com" }),
}));
vi.mock("./service.analysis.commit-stats-cache.js", () => cacheMocks);

import {
  contributorKeyFromCommit,
  fetchBranchCommitCount,
  fetchCommitsForLinkedRepository,
  fetchCommitStatsForRepository,
  fetchUserCommitsForRepositoryPage,
  fetchRecentCommitsForBranch,
  getBranchAheadBehind,
  listRepositoryBranches,
  listRepositoryBranchesLive,
  toUtcDayKey,
} from "./service.analysis.fetch.js";

function response(status: number, body: unknown, headers?: Record<string, string>) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
    headers: {
      get: vi.fn((name: string) => {
        const key = Object.keys(headers || {}).find((entry) => entry.toLowerCase() === name.toLowerCase());
        return key ? headers?.[key] ?? null : null;
      }),
    },
  } as any;
}

describe("github service.analysis.fetch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("computes UTC day and contributor keys", () => {
    expect(toUtcDayKey(new Date("2026-03-07T15:00:00.000Z"))).toBe("2026-03-07");
    expect(
      contributorKeyFromCommit({
        sha: "a",
        commit: { author: { date: "", email: null, name: null } },
        author: { login: "Alice" },
      } as any)
    ).toBe("login:alice");
    expect(
      contributorKeyFromCommit({
        sha: "b",
        commit: { author: { date: "", email: "A@X.COM", name: null } },
        author: null,
      } as any)
    ).toBe("email:a@x.com");
  });

  it("fetchCommitsForLinkedRepository paginates and handles 409 empty repo", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response(200, new Array(100).fill({ sha: "a", commit: { author: null }, author: null })))
      .mockResolvedValueOnce(response(200, [{ sha: "b", commit: { author: null }, author: null }]));
    vi.stubGlobal("fetch", fetchMock);

    const commits = await fetchCommitsForLinkedRepository("token", "org/repo", "main", "2026-01-01T00:00:00.000Z");
    expect(commits).toHaveLength(101);

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(409, {})));
    await expect(
      fetchCommitsForLinkedRepository("token", "org/repo", "main", "2026-01-01T00:00:00.000Z")
    ).resolves.toEqual([]);
  });

  it("fetches exact branch commit count via pagination headers", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        response(
          200,
          [{ sha: "tip", commit: { author: null }, author: null }],
          {
            link:
              '<https://api.github.com/repositories/1/commits?sha=main&per_page=1&page=2>; rel="next", <https://api.github.com/repositories/1/commits?sha=main&per_page=1&page=371>; rel="last"',
          }
        )
      )
    );

    await expect(fetchBranchCommitCount("token", "org/repo", "main")).resolves.toBe(371);
  });

  it("returns zero branch commits for empty repositories", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(409, {})));
    await expect(fetchBranchCommitCount("token", "org/repo", "main")).resolves.toBe(0);
  });

  it("fetches beyond 10 pages and can run without a since filter", async () => {
    const page = new Array(100).fill({ sha: "x", commit: { author: null }, author: null });
    const fetchMock = vi.fn();
    for (let i = 0; i < 11; i += 1) {
      fetchMock.mockResolvedValueOnce(response(200, page));
    }
    fetchMock.mockResolvedValueOnce(response(200, []));
    vi.stubGlobal("fetch", fetchMock);

    const commits = await fetchCommitsForLinkedRepository("token", "org/repo", "main");

    expect(commits).toHaveLength(1100);
    expect(fetchMock).toHaveBeenCalledTimes(12);
    expect(String(fetchMock.mock.calls[0]?.[0] ?? "")).not.toContain("since=");
  });

  it("throws typed errors for recent branch commit fetch", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(404, {})));
    await expect(fetchRecentCommitsForBranch("token", "org/repo", "main", 10)).rejects.toEqual(
      new GithubServiceError(404, "Linked GitHub repository or branch was not found")
    );
  });

  it("throws typed errors for live branch listing and user commit paging", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(401, {})));
    await expect(listRepositoryBranchesLive("token", "org/repo")).rejects.toEqual(
      new GithubServiceError(401, "GitHub access token is invalid or expired")
    );

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(404, {})));
    await expect(fetchUserCommitsForRepositoryPage("token", "org/repo", "alice", 1, 10)).rejects.toEqual(
      new GithubServiceError(404, "Linked GitHub repository was not found")
    );
  });

  it("lists repository branches and compares ahead/behind safely", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(response(200, [{ name: "main" }, { name: "dev" }]))
        .mockResolvedValueOnce(response(200, []))
    );
    await expect(listRepositoryBranches("token", "org/repo")).resolves.toEqual(["main", "dev"]);
    await expect(getBranchAheadBehind("token", "org/repo", "main", "main")).resolves.toEqual({
      aheadBy: 0,
      behindBy: 0,
      status: "identical",
    });
  });

  it("uses cached commit stats and fetches missing ones", async () => {
    cacheMocks.getCachedCommitStats.mockImplementation((_full, sha) =>
      sha === "cached" ? { additions: 3, deletions: 1 } : null
    );
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(response(200, { sha: "missing", stats: { additions: 2, deletions: 4 } }))
    );

    const result = await fetchCommitStatsForRepository("token", "org/repo", ["cached", "missing"], 10);
    expect(result.get("cached")).toEqual({ additions: 3, deletions: 1 });
    expect(result.get("missing")).toEqual({ additions: 2, deletions: 4 });
    expect(cacheMocks.setCachedCommitStats).toHaveBeenCalledWith("org/repo", "missing", {
      additions: 2,
      deletions: 4,
    });
  });

  it("fetches all provided commit stats when no explicit limit is passed", async () => {
    cacheMocks.getCachedCommitStats.mockReturnValue(null);
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(response(200, { sha: "one", stats: { additions: 1, deletions: 0 } }))
        .mockResolvedValueOnce(response(200, { sha: "two", stats: { additions: 2, deletions: 1 } }))
    );

    const result = await fetchCommitStatsForRepository("token", "org/repo", ["one", "two"]);

    expect(result.get("one")).toEqual({ additions: 1, deletions: 0 });
    expect(result.get("two")).toEqual({ additions: 2, deletions: 1 });
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it("respects a zero detailed-commit limit and skips network fetches", async () => {
    cacheMocks.getCachedCommitStats.mockReturnValue(null);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchCommitStatsForRepository("token", "org/repo", ["one", "two"], 0);

    expect(result.size).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("stops fetching additional commit stats after a rate-limit style response", async () => {
    cacheMocks.getCachedCommitStats.mockReturnValue(null);
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(response(403, {}))
        .mockResolvedValueOnce(response(200, { sha: "two", stats: { additions: 2, deletions: 1 } }))
    );

    const result = await fetchCommitStatsForRepository("token", "org/repo", ["one", "two"], 2);

    expect(result.size).toBeLessThanOrEqual(1);
    expect(result.has("one")).toBe(false);
  });
});
