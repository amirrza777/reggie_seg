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
  fetchCommitsForLinkedRepository,
  fetchCommitStatsForRepository,
  fetchRecentCommitsForBranch,
  getBranchAheadBehind,
  listRepositoryBranches,
  toUtcDayKey,
} from "./service.analysis.fetch.js";

function response(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
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

  it("throws typed errors for recent branch commit fetch", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(404, {})));
    await expect(fetchRecentCommitsForBranch("token", "org/repo", "main", 10)).rejects.toEqual(
      new GithubServiceError(404, "Linked GitHub repository or branch was not found")
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
});
