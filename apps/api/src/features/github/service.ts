import { getGitHubApiConfig } from "./config.js";
import {
  createGithubSnapshot,
  deactivateProjectGithubRepositoryLink,
  findActiveProjectGithubRepositoryLink,
  deleteGithubAccountByUserId,
  findGithubAccountStatusByUserId,
  findGithubAccountByUserId,
  findProjectGithubRepositoryLinkById,
  findGithubSnapshotById,
  findLatestGithubSnapshotByProjectLinkId,
  findLatestGithubSnapshotCoverageByProjectLinkId,
  isUserInProject,
  listGithubSnapshotsByProjectLinkId,
  listProjectGithubRepositoryLinks,
  listProjectGithubIdentityCandidates,
  updateProjectGithubRepositorySyncSettings,
  upsertGithubRepository,
  upsertProjectGithubRepositoryLink,
} from "./repo.js";
import {
  buildGithubConnectUrl,
  connectGithubAccount,
  getValidGithubAccessToken,
} from "./oauth.service.js";
import { GithubServiceError } from "./errors.js";

type GithubRepoResponse = {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  private: boolean;
  default_branch: string;
  owner?: {
    login?: string;
  };
};

type GithubRepositoryListItem = {
  githubRepoId: number;
  name: string;
  fullName: string;
  htmlUrl: string;
  isPrivate: boolean;
  ownerLogin: string | null;
  defaultBranch: string | null;
};

async function fetchUserRepositories(accessToken: string) {
  return fetchGitHubAppUserRepositories(accessToken);
}

type GithubInstallationListResponse = {
  installations: Array<{ id: number }>;
};

type GithubInstallationReposResponse = {
  repositories: GithubRepoResponse[];
};

async function fetchGitHubAppUserRepositories(accessToken: string) {
  const { baseUrl } = getGitHubApiConfig();
  const repositoryById = new Map<number, GithubRepoResponse>();
  let installationPage = 1;
  let totalInstallations = 0;

  while (true) {
    const installationsResponse = await fetch(
      `${baseUrl}/user/installations?per_page=100&page=${installationPage}`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${accessToken}`,
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );

    if (!installationsResponse.ok) {
      if (installationsResponse.status === 401) {
        throw new GithubServiceError(401, "GitHub access token is invalid or expired");
      }
      throw new GithubServiceError(502, "Failed to fetch GitHub App installations");
    }

    const installationsData = (await installationsResponse.json()) as GithubInstallationListResponse;
    const installations = installationsData.installations || [];
    totalInstallations += installations.length;

    for (const installation of installations) {
      let repoPage = 1;
      while (true) {
        const reposResponse = await fetch(
          `${baseUrl}/user/installations/${installation.id}/repositories?per_page=100&page=${repoPage}`,
          {
            headers: {
              Accept: "application/vnd.github+json",
              Authorization: `Bearer ${accessToken}`,
              "X-GitHub-Api-Version": "2022-11-28",
            },
          }
        );

        if (!reposResponse.ok) {
          if (reposResponse.status === 403 || reposResponse.status === 404) {
            break;
          }
          throw new GithubServiceError(502, "Failed to fetch repositories for GitHub App installation");
        }

        const reposData = (await reposResponse.json()) as GithubInstallationReposResponse;
        const repositories = reposData.repositories || [];
        for (const repository of repositories) {
          repositoryById.set(repository.id, repository);
        }

        if (repositories.length < 100) {
          break;
        }
        repoPage += 1;
        if (repoPage > 10) {
          break;
        }
      }
    }

    if (installations.length < 100) {
      break;
    }
    installationPage += 1;
    if (installationPage > 5) {
      break;
    }
  }

  if (totalInstallations === 0) {
    throw new GithubServiceError(
      403,
      "GitHub App is connected but not installed on any account or organization. Install the app, then try again."
    );
  }

  return Array.from(repositoryById.values());
}


export async function listGithubRepositoriesForUser(userId: number) {
  const account = await findGithubAccountByUserId(userId);
  if (!account) {
    throw new GithubServiceError(404, "GitHub account is not connected");
  }

  const accessToken = await getValidGithubAccessToken(account);
  const repositories = await fetchUserRepositories(accessToken);

  return repositories.map((repo): GithubRepositoryListItem => ({
    githubRepoId: repo.id,
    name: repo.name,
    fullName: repo.full_name,
    htmlUrl: repo.html_url,
    isPrivate: repo.private,
    ownerLogin: repo.owner?.login || null,
    defaultBranch: repo.default_branch || null,
  }));
}

export async function getGithubConnectionStatus(userId: number) {
  const account = await findGithubAccountStatusByUserId(userId);
  if (!account) {
    return {
      connected: false,
      account: null,
    };
  }

  return {
    connected: true,
    account,
  };
}

export async function disconnectGithubAccount(userId: number) {
  const account = await findGithubAccountStatusByUserId(userId);
  if (!account) {
    return { disconnected: true, alreadyDisconnected: true };
  }

  await deleteGithubAccountByUserId(userId);
  return { disconnected: true, alreadyDisconnected: false };
}

type LinkGithubRepositoryToProjectInput = {
  projectId: number;
  githubRepoId: number;
  name: string;
  fullName: string;
  htmlUrl: string;
  isPrivate: boolean;
  ownerLogin: string;
  defaultBranch: string | null;
};

export async function linkGithubRepositoryToProject(userId: number, input: LinkGithubRepositoryToProjectInput) {
  const isMember = await isUserInProject(userId, input.projectId);
  if (!isMember) {
    throw new GithubServiceError(403, "You are not a member of this project");
  }

  const existingActiveLink = await findActiveProjectGithubRepositoryLink(input.projectId);
  if (existingActiveLink) {
    throw new GithubServiceError(
      409,
      `This project already has a linked repository (${existingActiveLink.repository.fullName}). Remove it before linking another one.`
    );
  }

  const repository = await upsertGithubRepository({
    githubRepoId: BigInt(input.githubRepoId),
    ownerLogin: input.ownerLogin,
    name: input.name,
    fullName: input.fullName,
    htmlUrl: input.htmlUrl,
    isPrivate: input.isPrivate,
    defaultBranch: input.defaultBranch,
  });

  const link = await upsertProjectGithubRepositoryLink(input.projectId, repository.id, userId);
  let snapshot;
  try {
    snapshot = await analyseProjectGithubRepository(userId, link.id);
  } catch (error) {
    // If auto-analysis fails, deactivate the fresh link so user can retry linking.
    await deactivateProjectGithubRepositoryLink(link.id).catch(() => {
      // best effort rollback; original analysis error is the actionable one
    });
    if (error instanceof GithubServiceError) {
      throw error;
    }
    throw new GithubServiceError(502, "Repository linked but analysis failed. Please try linking again.");
  }

  return {
    link,
    repository,
    snapshot,
  };
}

export async function listProjectGithubRepositories(userId: number, projectId: number) {
  const isMember = await isUserInProject(userId, projectId);
  if (!isMember) {
    throw new GithubServiceError(403, "You are not a member of this project");
  }

  return listProjectGithubRepositoryLinks(projectId);
}

type GithubCommitListItem = {
  sha: string;
  commit: {
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
};

type AggregatedContributor = {
  contributorKey: string;
  githubUserId: bigint | null;
  githubLogin: string | null;
  authorEmail: string | null;
  commits: number;
  additions: number;
  deletions: number;
  firstCommitAt: Date | null;
  lastCommitAt: Date | null;
  commitsByDay: Record<string, number>;
  commitsByBranch: Record<string, number>;
};

function toUtcDayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function contributorKeyFromCommit(commit: GithubCommitListItem) {
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

async function fetchCommitsForLinkedRepository(accessToken: string, fullName: string, branch: string, sinceIso: string) {
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

async function listRepositoryBranches(accessToken: string, fullName: string) {
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

async function fetchCommitStatsForRepository(
  accessToken: string,
  fullName: string,
  commitShas: string[]
) {
  const { baseUrl } = getGitHubApiConfig();
  const statsBySha = new Map<string, { additions: number; deletions: number }>();
  const maxDetailedCommits = 250;
  const shasToFetch = commitShas.slice(0, maxDetailedCommits);

  for (const sha of shasToFetch) {
    const response = await fetch(`${baseUrl}/repos/${fullName}/commits/${encodeURIComponent(sha)}`, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${accessToken}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (!response.ok) {
      if (response.status === 403 || response.status === 429) {
        break;
      }
      continue;
    }

    const detail = (await response.json()) as GithubCommitDetailResponse;
    statsBySha.set(sha, {
      additions: detail.stats?.additions || 0,
      deletions: detail.stats?.deletions || 0,
    });
  }

  return statsBySha;
}

function aggregateCommitData(commits: GithubCommitListItem[], defaultBranch: string) {
  const contributors = new Map<string, AggregatedContributor>();
  const repoCommitsByDay: Record<string, number> = {};
  const repoCommitsByBranch: Record<string, number> = {};
  repoCommitsByBranch[defaultBranch] = 0;

  for (const commit of commits) {
    if (!commit.commit.author?.date) {
      continue;
    }
    const commitDate = new Date(commit.commit.author.date);
    if (Number.isNaN(commitDate.getTime())) {
      continue;
    }

    const contributorKey = contributorKeyFromCommit(commit);
    const existing = contributors.get(contributorKey);
    const dayKey = toUtcDayKey(commitDate);

    if (!existing) {
      contributors.set(contributorKey, {
        contributorKey,
        githubUserId: commit.author?.id ? BigInt(commit.author.id) : null,
        githubLogin: commit.author?.login || null,
        authorEmail: commit.commit.author.email || null,
        commits: 1,
        additions: 0,
        deletions: 0,
        firstCommitAt: commitDate,
        lastCommitAt: commitDate,
        commitsByDay: { [dayKey]: 1 },
        commitsByBranch: { [defaultBranch]: 1 },
      });
    } else {
      existing.commits += 1;
      existing.commitsByDay[dayKey] = (existing.commitsByDay[dayKey] || 0) + 1;
      existing.commitsByBranch[defaultBranch] = (existing.commitsByBranch[defaultBranch] || 0) + 1;
      if (!existing.firstCommitAt || commitDate < existing.firstCommitAt) {
        existing.firstCommitAt = commitDate;
      }
      if (!existing.lastCommitAt || commitDate > existing.lastCommitAt) {
        existing.lastCommitAt = commitDate;
      }
    }

    repoCommitsByDay[dayKey] = (repoCommitsByDay[dayKey] || 0) + 1;
    repoCommitsByBranch[defaultBranch] = (repoCommitsByBranch[defaultBranch] || 0) + 1;
  }

  return {
    contributors: Array.from(contributors.values()),
    repoCommitsByDay,
    repoCommitsByBranch,
  };
}

export async function analyseProjectGithubRepository(userId: number, linkId: number) {
  const link = await findProjectGithubRepositoryLinkById(linkId);
  if (!link) {
    throw new GithubServiceError(404, "Project GitHub repository link not found");
  }

  const isMember = await isUserInProject(userId, link.projectId);
  if (!isMember) {
    throw new GithubServiceError(403, "You are not a member of this project");
  }

  const account = await findGithubAccountByUserId(userId);
  if (!account) {
    throw new GithubServiceError(404, "GitHub account is not connected");
  }

  const accessToken = await getValidGithubAccessToken(account);
  const defaultBranch = link.repository.defaultBranch || "main";
  const sinceDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const commits = await fetchCommitsForLinkedRepository(accessToken, link.repository.fullName, defaultBranch, sinceDate.toISOString());
  const branchNames = await listRepositoryBranches(accessToken, link.repository.fullName);
  const allBranchNames = branchNames.length > 0 ? branchNames : [defaultBranch];
  const allBranchCommitBySha = new Map<string, GithubCommitListItem>();
  const allBranchCommitCountByBranch: Record<string, number> = {};
  for (const branchName of allBranchNames) {
    const branchCommits = await fetchCommitsForLinkedRepository(
      accessToken,
      link.repository.fullName,
      branchName,
      sinceDate.toISOString()
    );
    allBranchCommitCountByBranch[branchName] = branchCommits.length;
    for (const branchCommit of branchCommits) {
      if (!allBranchCommitBySha.has(branchCommit.sha)) {
        allBranchCommitBySha.set(branchCommit.sha, branchCommit);
      }
    }
  }
  const allBranchCommits = Array.from(allBranchCommitBySha.values());
  const commitStatsBySha = await fetchCommitStatsForRepository(
    accessToken,
    link.repository.fullName,
    commits.map((commit) => commit.sha)
  );
  const allBranchCommitStatsBySha = await fetchCommitStatsForRepository(
    accessToken,
    link.repository.fullName,
    allBranchCommits.map((commit) => commit.sha)
  );
  const aggregated = aggregateCommitData(commits, defaultBranch);

  const identities = await listProjectGithubIdentityCandidates(link.projectId);
  const byLogin = new Map<string, number>();
  const byEmail = new Map<string, number>();
  for (const identity of identities) {
    if (identity.githubLogin) {
      byLogin.set(identity.githubLogin.toLowerCase(), identity.userId);
    }
    if (identity.githubEmail) {
      byEmail.set(identity.githubEmail.toLowerCase(), identity.userId);
    }
  }

  const userStats = aggregated.contributors.map((contributor) => {
    const mappedByLogin = contributor.githubLogin ? byLogin.get(contributor.githubLogin.toLowerCase()) : undefined;
    const mappedByEmail = contributor.authorEmail ? byEmail.get(contributor.authorEmail.toLowerCase()) : undefined;
    const mappedUserId = mappedByLogin ?? mappedByEmail ?? null;

    return {
      mappedUserId,
      contributorKey: contributor.contributorKey,
      githubUserId: contributor.githubUserId,
      githubLogin: contributor.githubLogin,
      authorEmail: contributor.authorEmail,
      isMatched: Boolean(mappedUserId),
      commits: contributor.commits,
      additions: contributor.additions,
      deletions: contributor.deletions,
      commitsByDay: contributor.commitsByDay,
      commitsByBranch: contributor.commitsByBranch,
      firstCommitAt: contributor.firstCommitAt,
      lastCommitAt: contributor.lastCommitAt,
    };
  });

  const contributorKeyBySha = new Map<string, string>();
  for (const commit of commits) {
    contributorKeyBySha.set(commit.sha, contributorKeyFromCommit(commit));
  }
  const userStatsByKey = new Map(userStats.map((stat) => [stat.contributorKey, stat]));
  for (const [sha, stat] of commitStatsBySha.entries()) {
    const contributorKey = contributorKeyBySha.get(sha);
    if (!contributorKey) {
      continue;
    }
    const userStat = userStatsByKey.get(contributorKey);
    if (!userStat) {
      continue;
    }
    userStat.additions += stat.additions;
    userStat.deletions += stat.deletions;
  }

  const totalCommits = userStats.reduce((sum, stat) => sum + stat.commits, 0);
  const totalAdditions = userStats.reduce((sum, stat) => sum + stat.additions, 0);
  const totalDeletions = userStats.reduce((sum, stat) => sum + stat.deletions, 0);
  const allBranchesTotalCommits = allBranchCommits.length;
  const allBranchesTotalAdditions = Array.from(allBranchCommitStatsBySha.values()).reduce(
    (sum, stat) => sum + stat.additions,
    0
  );
  const allBranchesTotalDeletions = Array.from(allBranchCommitStatsBySha.values()).reduce(
    (sum, stat) => sum + stat.deletions,
    0
  );
  const matchedContributors = userStats.filter((stat) => stat.isMatched).length;
  const unmatchedContributors = userStats.length - matchedContributors;
  const unmatchedCommits = userStats.filter((stat) => !stat.isMatched).reduce((sum, stat) => sum + stat.commits, 0);

  const snapshot = await createGithubSnapshot({
    projectGithubRepositoryId: link.id,
    analysedByUserId: userId,
    nextSyncIntervalMinutes: link.syncIntervalMinutes || 60,
    data: {
      repository: {
        id: link.repository.id,
        fullName: link.repository.fullName,
        htmlUrl: link.repository.htmlUrl,
        ownerLogin: link.repository.ownerLogin,
        defaultBranch,
      },
      analysedWindow: {
        since: sinceDate.toISOString(),
        until: new Date().toISOString(),
      },
      commitCount: commits.length,
      commitStatsCoverage: {
        detailedCommitCount: commitStatsBySha.size,
        requestedCommitCount: commits.length,
      },
      branchScopeStats: {
        defaultBranch: {
          branch: defaultBranch,
          totalCommits,
          totalAdditions,
          totalDeletions,
        },
        allBranches: {
          branchCount: allBranchNames.length,
          totalCommits: allBranchesTotalCommits,
          totalAdditions: allBranchesTotalAdditions,
          totalDeletions: allBranchesTotalDeletions,
          commitsByBranch: allBranchCommitCountByBranch,
          commitStatsCoverage: {
            detailedCommitCount: allBranchCommitStatsBySha.size,
            requestedCommitCount: allBranchCommits.length,
          },
        },
      },
      sampleCommits: commits.slice(0, 200).map((commit) => ({
        sha: commit.sha,
        date: commit.commit.author?.date || null,
        login: commit.author?.login || null,
        email: commit.commit.author?.email || null,
      })),
    },
    userStats,
    repoStat: {
      totalCommits,
      totalAdditions,
      totalDeletions,
      totalContributors: userStats.length,
      matchedContributors,
      unmatchedContributors,
      unmatchedCommits,
      defaultBranchCommits: totalCommits,
      commitsByDay: aggregated.repoCommitsByDay,
      commitsByBranch: aggregated.repoCommitsByBranch,
    },
  });

  return snapshot;
}

export async function listProjectGithubRepositorySnapshots(userId: number, linkId: number) {
  const link = await findProjectGithubRepositoryLinkById(linkId);
  if (!link) {
    throw new GithubServiceError(404, "Project GitHub repository link not found");
  }

  const isMember = await isUserInProject(userId, link.projectId);
  if (!isMember) {
    throw new GithubServiceError(403, "You are not a member of this project");
  }

  return listGithubSnapshotsByProjectLinkId(link.id);
}

export async function getProjectGithubRepositorySnapshot(userId: number, snapshotId: number) {
  const snapshot = await findGithubSnapshotById(snapshotId);
  if (!snapshot) {
    throw new GithubServiceError(404, "GitHub snapshot not found");
  }

  const isMember = await isUserInProject(userId, snapshot.repoLink.projectId);
  if (!isMember) {
    throw new GithubServiceError(403, "You are not a member of this project");
  }

  return snapshot;
}

export async function getLatestProjectGithubRepositorySnapshot(userId: number, linkId: number) {
  const link = await findProjectGithubRepositoryLinkById(linkId);
  if (!link) {
    throw new GithubServiceError(404, "Project GitHub repository link not found");
  }

  const isMember = await isUserInProject(userId, link.projectId);
  if (!isMember) {
    throw new GithubServiceError(403, "You are not a member of this project");
  }

  const snapshot = await findLatestGithubSnapshotByProjectLinkId(link.id);
  if (!snapshot) {
    throw new GithubServiceError(404, "No snapshots found for this project repository link");
  }

  return snapshot;
}

export async function getProjectGithubMappingCoverage(userId: number, linkId: number) {
  const link = await findProjectGithubRepositoryLinkById(linkId);
  if (!link) {
    throw new GithubServiceError(404, "Project GitHub repository link not found");
  }

  const isMember = await isUserInProject(userId, link.projectId);
  if (!isMember) {
    throw new GithubServiceError(403, "You are not a member of this project");
  }

  const latest = await findLatestGithubSnapshotCoverageByProjectLinkId(link.id);
  if (!latest || !latest.repoStats) {
    return {
      linkId: link.id,
      snapshotId: null,
      analysedAt: null,
      coverage: null,
    };
  }

  return {
    linkId: link.id,
    snapshotId: latest.id,
    analysedAt: latest.analysedAt,
    coverage: {
      totalContributors: latest.repoStats.totalContributors,
      matchedContributors: latest.repoStats.matchedContributors,
      unmatchedContributors: latest.repoStats.unmatchedContributors,
      totalCommits: latest.repoStats.totalCommits,
      unmatchedCommits: latest.repoStats.unmatchedCommits,
    },
  };
}

type UpdateProjectGithubSyncSettingsInput = {
  autoSyncEnabled: boolean;
  syncIntervalMinutes: number;
};

export async function updateProjectGithubSyncSettings(
  userId: number,
  linkId: number,
  input: UpdateProjectGithubSyncSettingsInput
) {
  const link = await findProjectGithubRepositoryLinkById(linkId);
  if (!link) {
    throw new GithubServiceError(404, "Project GitHub repository link not found");
  }

  const isMember = await isUserInProject(userId, link.projectId);
  if (!isMember) {
    throw new GithubServiceError(403, "You are not a member of this project");
  }

  const interval = Math.max(15, Math.min(1440, input.syncIntervalMinutes));
  return updateProjectGithubRepositorySyncSettings({
    linkId: link.id,
    autoSyncEnabled: input.autoSyncEnabled,
    syncIntervalMinutes: interval,
  });
}

export async function removeProjectGithubRepositoryLink(userId: number, linkId: number) {
  const link = await findProjectGithubRepositoryLinkById(linkId);
  if (!link) {
    throw new GithubServiceError(404, "Project GitHub repository link not found");
  }

  const isMember = await isUserInProject(userId, link.projectId);
  if (!isMember) {
    throw new GithubServiceError(403, "You are not a member of this project");
  }

  return deactivateProjectGithubRepositoryLink(link.id);
}

export { buildGithubConnectUrl, connectGithubAccount, GithubServiceError };
