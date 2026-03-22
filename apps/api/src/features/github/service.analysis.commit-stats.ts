import { getGitHubApiConfig } from "./config.js";
import { getCachedCommitStats, setCachedCommitStats } from "./service.analysis.commit-stats-cache.js";

type GithubCommitDetailResponse = {
  sha: string;
  stats?: {
    additions?: number;
    deletions?: number;
  };
};

/** Returns the commit stats for repository. */
export async function fetchCommitStatsForRepository(
  accessToken: string,
  fullName: string,
  commitShas: string[],
  maxDetailedCommits?: number
) {
  const { baseUrl } = getGitHubApiConfig();
  const statsBySha = new Map<string, { additions: number; deletions: number }>();
  const limit =
    typeof maxDetailedCommits === "number" && Number.isFinite(maxDetailedCommits)
      ? Math.max(0, Math.floor(maxDetailedCommits))
      : commitShas.length;
  const shasToFetch = commitShas.slice(0, limit);
  const missingShas: string[] = [];

  for (const sha of shasToFetch) {
    const cached = getCachedCommitStats(fullName, sha);
    if (cached) {
      statsBySha.set(sha, { additions: cached.additions, deletions: cached.deletions });
      continue;
    }
    missingShas.push(sha);
  }

  if (missingShas.length > 0) {
    let shouldStop = false;
    const concurrency = 6;
    let nextIndex = 0;

    const workers = Array.from({ length: Math.min(concurrency, missingShas.length) }, async () => {
      while (!shouldStop) {
        const currentIndex = nextIndex;
        nextIndex += 1;
        if (currentIndex >= missingShas.length) {
          return;
        }

        const sha = missingShas[currentIndex];
        if (sha === undefined) {
          continue;
        }
        const response = await fetch(`${baseUrl}/repos/${fullName}/commits/${encodeURIComponent(sha)}`, {
          headers: {
            Accept: "application/vnd.github+json",
            Authorization: `Bearer ${accessToken}`,
            "X-GitHub-Api-Version": "2022-11-28",
          },
        });

        if (!response.ok) {
          if (response.status === 403 || response.status === 429) {
            shouldStop = true;
          }
          continue;
        }

        const detail = (await response.json()) as GithubCommitDetailResponse;
        const stats = {
          additions: detail.stats?.additions || 0,
          deletions: detail.stats?.deletions || 0,
        };
        statsBySha.set(sha, stats);
        setCachedCommitStats(fullName, sha, stats);
      }
    });

    await Promise.all(workers);
  }

  return statsBySha;
}