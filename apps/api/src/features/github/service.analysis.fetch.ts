import { getGitHubApiConfig } from "./config.js";
import { GithubServiceError } from "./errors.js";
import { parseLastPageFromLinkHeader } from "./service.analysis.link-header.js";
export { fetchCommitStatsForRepository } from "./service.analysis.commit-stats.js";

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

/** Converts the utc day key. */
export function toUtcDayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

/** Executes the contributor key from commit. */
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

/** Returns the commits for linked repository. */
export async function fetchCommitsForLinkedRepository(accessToken: string, fullName: string, branch: string, sinceIso: string) {
  const { baseUrl } = getGitHubApiConfig();
  const commits: GithubCommitListItem[] = [];
  let page = 1;

  while (true) {
    const params = new URLSearchParams({
      sha: branch,
      per_page: "100",
      page: String(page),
    });
    if (sinceIso) {
      params.set("since", sinceIso);
    }

    const response = await fetch(
      `${baseUrl}/repos/${fullName}/commits?${params.toString()}`,
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
  }

  return commits;
}

/** Returns the recent commits for branch. */
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

/** Returns the user commits for repository page. */
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

/** Returns the all user commits for repository. */
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
  }

  return commits;
}

/** Returns the repository branches. */
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
  }

  return Array.from(new Set(branches));
}

/** Returns the repository branches live. */
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
  }

  return branches;
}

/** Returns the branch ahead behind. */
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

/** Returns the total number of commits on a branch by reading the last page from the Link header. */
export async function fetchBranchCommitCount(accessToken: string, fullName: string, branch: string) {
  const { baseUrl } = getGitHubApiConfig();
  const response = await fetch(`${baseUrl}/repos/${fullName}/commits?sha=${encodeURIComponent(branch)}&per_page=1`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${accessToken}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!response.ok) return 0;
  return parseLastPageFromLinkHeader(response.headers.get("link")) ?? 1;
}

