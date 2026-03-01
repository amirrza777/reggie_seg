import { getGitHubApiConfig } from "./config.js";
import { GithubServiceError } from "./errors.js";
import { getCachedCommitStats, setCachedCommitStats } from "./service.analysis.commit-stats-cache.js";

export type GithubCommitListItem = {
  sha: string;
  commit: {
    message?: string;
    author: {
      date: string;
      email: string | null;
      name: string | null;
    } | null;
  };
  author: {
    id?: number;
    login?: string;
  } | null;
  parents?: Array<{
    sha?: string;
  }>;
};

type GithubCommitDetailResponse = {
  sha: string;
  stats?: {
    additions?: number;
    deletions?: number;
  };
};

type GithubBranchResponseItem = {
  name: string;
  protected?: boolean;
  commit?: {
    sha?: string;
  };
};

type GithubCompareResponse = {
  status?: string;
  ahead_by?: number;
  behind_by?: number;
};

export function toUtcDayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function contributorKeyFromCommit(commit: GithubCommitListItem) {
  const login = commit.author?.login?.trim().toLowerCase();
  if (login) {
    return `login:${login}`;
  }
  const email = commit.commit.author?.email?.trim().toLowerCase();
  if (email) {
    return `email:${email}`;
  }
  return "unmatched:unknown";
}

export async function fetchCommitsForLinkedRepository(accessToken: string, fullName: string, branch: string, sinceIso: string) {
  const { baseUrl } = getGitHubApiConfig();
  const commits: GithubCommitListItem[] = [];
  let page = 1;

  while (true) {
    const response = await fetch(
      `${baseUrl}/repos/${fullName}/commits?sha=${encodeURIComponent(branch)}&since=${encodeURIComponent(sinceIso)}&per_page=100&page=${page}`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${accessToken}`,
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        throw new GithubServiceError(404, "Linked GitHub repository was not found");
      }
      if (response.status === 409) {
        // Empty repositories/branches can return 409 from the commits API.
        return [];
      }
      if (response.status === 401) {
        throw new GithubServiceError(401, "GitHub access token is invalid or expired");
      }
      throw new GithubServiceError(502, "Failed to fetch repository commits");
    }

    const pageData = (await response.json()) as GithubCommitListItem[];
    commits.push(...pageData);

    if (pageData.length < 100) {
      break;
    }
    page += 1;
    if (page > 10) {
      break;
    }
  }

  return commits;
}

export async function fetchRecentCommitsForBranch(
  accessToken: string,
  fullName: string,
  branch: string,
  limit: number
) {
  const { baseUrl } = getGitHubApiConfig();
  const safeLimit = Math.max(1, Math.min(50, limit));
  const response = await fetch(
    `${baseUrl}/repos/${fullName}/commits?sha=${encodeURIComponent(branch)}&per_page=${safeLimit}&page=1`,
    {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${accessToken}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }
  );

  if (!response.ok) {
    if (response.status === 404) {
      throw new GithubServiceError(404, "Linked GitHub repository or branch was not found");
    }
    if (response.status === 409) {
      return [];
    }
    if (response.status === 401) {
      throw new GithubServiceError(401, "GitHub access token is invalid or expired");
    }
    throw new GithubServiceError(502, "Failed to fetch branch commits");
  }

  return (await response.json()) as GithubCommitListItem[];
}

export async function fetchUserCommitsForRepositoryPage(
  accessToken: string,
  fullName: string,
  author: string,
  page: number,
  perPage: number
) {
  const { baseUrl } = getGitHubApiConfig();
  const safePage = Math.max(1, page);
  const safePerPage = Math.max(1, Math.min(100, perPage));
  const params = new URLSearchParams({
    author,
    page: String(safePage),
    per_page: String(safePerPage),
  });

  const response = await fetch(`${baseUrl}/repos/${fullName}/commits?${params.toString()}`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${accessToken}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new GithubServiceError(404, "Linked GitHub repository was not found");
    }
    if (response.status === 409) {
      return [];
    }
    if (response.status === 401) {
      throw new GithubServiceError(401, "GitHub access token is invalid or expired");
    }
    throw new GithubServiceError(502, "Failed to fetch repository commits");
  }

  return (await response.json()) as GithubCommitListItem[];
}

export async function fetchAllUserCommitsForRepository(accessToken: string, fullName: string, author: string) {
  const commits: GithubCommitListItem[] = [];
  let page = 1;

  while (true) {
    const pageData = await fetchUserCommitsForRepositoryPage(accessToken, fullName, author, page, 100);
    commits.push(...pageData);
    if (pageData.length < 100) {
      break;
    }
    page += 1;
    if (page > 30) {
      break;
    }
  }

  return commits;
}

export async function listRepositoryBranches(accessToken: string, fullName: string) {
  const { baseUrl } = getGitHubApiConfig();
  const branches: string[] = [];
  let page = 1;

  while (true) {
    const response = await fetch(
      `${baseUrl}/repos/${fullName}/branches?per_page=100&page=${page}`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${accessToken}`,
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );

    if (!response.ok) {
      break;
    }

    const pageData = (await response.json()) as GithubBranchResponseItem[];
    branches.push(...pageData.map((branch) => branch.name).filter(Boolean));
    if (pageData.length < 100) {
      break;
    }
    page += 1;
    if (page > 5) {
      break;
    }
  }

  return Array.from(new Set(branches));
}

export async function listRepositoryBranchesLive(
  accessToken: string,
  fullName: string
): Promise<Array<{ name: string; protected: boolean; headSha: string | null }>> {
  const { baseUrl } = getGitHubApiConfig();
  const branches: Array<{ name: string; protected: boolean; headSha: string | null }> = [];
  let page = 1;

  while (true) {
    const response = await fetch(
      `${baseUrl}/repos/${fullName}/branches?per_page=100&page=${page}`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${accessToken}`,
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        throw new GithubServiceError(404, "Linked GitHub repository was not found");
      }
      if (response.status === 401) {
        throw new GithubServiceError(401, "GitHub access token is invalid or expired");
      }
      throw new GithubServiceError(502, "Failed to fetch repository branches");
    }

    const pageData = (await response.json()) as GithubBranchResponseItem[];
    for (const branch of pageData) {
      if (!branch?.name) {
        continue;
      }
      branches.push({
        name: branch.name,
        protected: Boolean(branch.protected),
        headSha: branch.commit?.sha || null,
      });
    }

    if (pageData.length < 100) {
      break;
    }
    page += 1;
    if (page > 5) {
      break;
    }
  }

  return branches;
}

export async function getBranchAheadBehind(
  accessToken: string,
  fullName: string,
  baseBranch: string,
  branchName: string
) {
  if (branchName === baseBranch) {
    return {
      aheadBy: 0,
      behindBy: 0,
      status: "identical",
    };
  }

  const { baseUrl } = getGitHubApiConfig();
  const response = await fetch(
    `${baseUrl}/repos/${fullName}/compare/${encodeURIComponent(baseBranch)}...${encodeURIComponent(branchName)}`,
    {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${accessToken}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }
  );

  if (!response.ok) {
    // Some branches may be deleted/race conditions/or compare unavailable. Return partial data instead of failing the whole list.
    return {
      aheadBy: null,
      behindBy: null,
      status: null,
    };
  }

  const compare = (await response.json()) as GithubCompareResponse;
  return {
    aheadBy: typeof compare.ahead_by === "number" ? compare.ahead_by : null,
    behindBy: typeof compare.behind_by === "number" ? compare.behind_by : null,
    status: typeof compare.status === "string" ? compare.status : null,
  };
}

export async function fetchCommitStatsForRepository(
  accessToken: string,
  fullName: string,
  commitShas: string[],
  maxDetailedCommits = 250
) {
  const { baseUrl } = getGitHubApiConfig();
  const statsBySha = new Map<string, { additions: number; deletions: number }>();
  const shasToFetch = commitShas.slice(0, maxDetailedCommits);
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
