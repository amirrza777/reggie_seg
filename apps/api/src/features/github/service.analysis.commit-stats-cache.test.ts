import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCachedCommitStats, setCachedCommitStats } from "./service.analysis.commit-stats-cache.js";

describe("commit stats cache", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it("returns null for missing keys and returns cached values for known keys", () => {
    expect(getCachedCommitStats("team/repo", "missing")).toBeNull();

    setCachedCommitStats("team/repo", "abc", { additions: 5, deletions: 2 });
    expect(getCachedCommitStats("team/repo", "abc")).toMatchObject({
      additions: 5,
      deletions: 2,
    });
  });

  it("expires cached entries after the TTL window", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-26T00:00:00Z"));

    setCachedCommitStats("team/repo", "ttl-test", { additions: 1, deletions: 1 });
    expect(getCachedCommitStats("team/repo", "ttl-test")).not.toBeNull();

    vi.setSystemTime(new Date("2026-02-28T00:00:01Z"));
    expect(getCachedCommitStats("team/repo", "ttl-test")).toBeNull();
  });
});

