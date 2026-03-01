type CachedCommitStats = {
  additions: number;
  deletions: number;
  cachedAt: number;
};

const githubCommitStatsCache = new Map<string, CachedCommitStats>();
const GITHUB_COMMIT_STATS_CACHE_TTL_MS = 1000 * 60 * 60 * 24;
const GITHUB_COMMIT_STATS_CACHE_MAX_ENTRIES = 10000;

function makeCommitStatsCacheKey(fullName: string, sha: string) {
  return `${fullName}:${sha}`;
}

export function getCachedCommitStats(fullName: string, sha: string) {
  const key = makeCommitStatsCacheKey(fullName, sha);
  const cached = githubCommitStatsCache.get(key);
  if (!cached) {
    return null;
  }
  if (Date.now() - cached.cachedAt > GITHUB_COMMIT_STATS_CACHE_TTL_MS) {
    githubCommitStatsCache.delete(key);
    return null;
  }
  return cached;
}

export function setCachedCommitStats(fullName: string, sha: string, value: { additions: number; deletions: number }) {
  const key = makeCommitStatsCacheKey(fullName, sha);
  if (githubCommitStatsCache.size >= GITHUB_COMMIT_STATS_CACHE_MAX_ENTRIES) {
    const oldestKey = githubCommitStatsCache.keys().next().value;
    if (typeof oldestKey === "string") {
      githubCommitStatsCache.delete(oldestKey);
    }
  }
  githubCommitStatsCache.set(key, {
    additions: value.additions,
    deletions: value.deletions,
    cachedAt: Date.now(),
  });
}

