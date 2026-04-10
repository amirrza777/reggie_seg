import { GithubServiceError } from "./errors.js";
import { getValidGithubAccessToken } from "./oauth.service.js";
import {
  deactivateProjectGithubRepositoryLink,
  findGithubAccountByUserId,
  findProjectGithubRepositoryLinkById,
  isUserInProject,
  listProjectGithubIdentityCandidates,
} from "./repo.js";
import {
  fetchAllUserCommitsForRepository,
  fetchCommitStatsForRepository,
  fetchRecentCommitsForBranch,
  fetchUserCommitsForRepositoryPage,
  getBranchAheadBehind,
  listRepositoryBranchesLive,
} from "./service.analysis.fetch.js";
import { isMergePullRequestCommit } from "./service.analysis.aggregate.js";
import { matchesFuzzySearchCandidate } from "../../shared/fuzzySearch.js";

type IdentityCandidate = {
  userId: number;
};

function addUniqueUserId(userIds: number[], value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value) || userIds.includes(value)) {
    return;
  }
  userIds.push(value);
}

function matchesBranchQuery(branchName: string, query: string): boolean {
  return matchesFuzzySearchCandidate({
    query,
    sources: [branchName],
  });
}

async function resolveProjectLinkAccessToken(params: {
  requesterUserId: number;
  linkedByUserId: number | null | undefined;
  identityCandidates: IdentityCandidate[];
}) {
  const candidateUserIds: number[] = [];
  addUniqueUserId(candidateUserIds, params.requesterUserId);
  addUniqueUserId(candidateUserIds, params.linkedByUserId);
  for (const identity of params.identityCandidates) {
    addUniqueUserId(candidateUserIds, identity.userId);
  }

  let hasConnectedAccount = false;
  for (const candidateUserId of candidateUserIds) {
    const account = await findGithubAccountByUserId(candidateUserId);
    if (!account) {
      continue;
    }

    hasConnectedAccount = true;
    try {
      return await getValidGithubAccessToken(account);
    } catch (error) {
      if (error instanceof GithubServiceError && error.status === 401) {
        continue;
      }
      throw error;
    }
  }

  if (!hasConnectedAccount) {
    throw new GithubServiceError(404, "GitHub account is not connected");
  }
  throw new GithubServiceError(
    401,
    "No valid GitHub access token is available for this project. Ask a team member to reconnect GitHub."
  );
}

/** Returns the live project GitHub repository branches. */
export async function listLiveProjectGithubRepositoryBranches(
  userId: number,
  linkId: number,
  options?: { query?: string | null },
) {
  const link = await findProjectGithubRepositoryLinkById(linkId);
  if (!link) {
    throw new GithubServiceError(404, "Project GitHub repository link not found");
  }

  const isMember = await isUserInProject(userId, link.projectId);
  if (!isMember) {
    throw new GithubServiceError(403, "You are not a member of this project");
  }

  const identities = await listProjectGithubIdentityCandidates(link.projectId);
  const accessToken = await resolveProjectLinkAccessToken({
    requesterUserId: userId,
    linkedByUserId: link.linkedByUserId,
    identityCandidates: identities,
  });

  const defaultBranch = link.repository.defaultBranch || "main";
  const liveBranches = await listRepositoryBranchesLive(accessToken, link.repository.fullName);
  const searchQuery = typeof options?.query === "string" ? options.query.trim() : "";
  const hasQuery = searchQuery.length > 0;
  const scopedBranches = hasQuery
    ? liveBranches.filter((branch) => matchesBranchQuery(branch.name, searchQuery))
    : liveBranches;

  const branchesWithCompare = await Promise.all(
    scopedBranches.map(async (branch) => {
      const compare = await getBranchAheadBehind(
        accessToken,
        link.repository.fullName,
        defaultBranch,
        branch.name
      );
      return {
        name: branch.name,
        isDefault: branch.name === defaultBranch,
        isProtected: branch.protected,
        headSha: branch.headSha,
        aheadBy: compare.aheadBy,
        behindBy: compare.behindBy,
        compareStatus: compare.status,
      };
    })
  );

  const branches = branchesWithCompare.sort((a, b) => {
    if (a.isDefault) {return -1;}
    if (b.isDefault) {return 1;}
    return a.name.localeCompare(b.name);
  });

  return {
    linkId: link.id,
    repository: {
      id: link.repository.id,
      fullName: link.repository.fullName,
      defaultBranch,
      htmlUrl: link.repository.htmlUrl,
    },
    branches,
  };
}

/** Returns the live project GitHub repository branch commits. */
export async function listLiveProjectGithubRepositoryBranchCommits(
  userId: number,
  linkId: number,
  branchName: string,
  limit = 10
) {
  const link = await findProjectGithubRepositoryLinkById(linkId);
  if (!link) {
    throw new GithubServiceError(404, "Project GitHub repository link not found");
  }

  const isMember = await isUserInProject(userId, link.projectId);
  if (!isMember) {
    throw new GithubServiceError(403, "You are not a member of this project");
  }

  const identities = await listProjectGithubIdentityCandidates(link.projectId);
  const accessToken = await resolveProjectLinkAccessToken({
    requesterUserId: userId,
    linkedByUserId: link.linkedByUserId,
    identityCandidates: identities,
  });

  const safeLimit = Math.max(1, Math.min(50, limit));
  let resolvedBranch = branchName;
  const commits = await fetchRecentCommitsForBranch(accessToken, link.repository.fullName, branchName, safeLimit).catch(
    async (error) => {
      if (!(error instanceof GithubServiceError) || error.status !== 404) {
        throw error;
      }

      const liveBranches = await listRepositoryBranchesLive(accessToken, link.repository.fullName);
      const fallbackBranch =
        liveBranches.find((branch) => branch.name === link.repository.defaultBranch)?.name || liveBranches[0]?.name;
      if (!fallbackBranch || fallbackBranch === branchName) {
        throw error;
      }

      resolvedBranch = fallbackBranch;
      return fetchRecentCommitsForBranch(accessToken, link.repository.fullName, fallbackBranch, safeLimit);
    }
  );
  const commitStatsBySha = await fetchCommitStatsForRepository(
    accessToken,
    link.repository.fullName,
    commits.map((commit) => commit.sha)
  );

  return {
    linkId: link.id,
    repository: {
      id: link.repository.id,
      fullName: link.repository.fullName,
      defaultBranch: link.repository.defaultBranch || "main",
      htmlUrl: link.repository.htmlUrl,
    },
    branch: resolvedBranch,
    commits: commits.map((commit) => {
      const stats = commitStatsBySha.get(commit.sha);
      return {
        sha: commit.sha,
        message: commit.commit.message || "",
        date: commit.commit.author?.date || null,
        authorLogin: commit.author?.login || null,
        authorEmail: commit.commit.author?.email || null,
        additions: stats?.additions ?? null,
        deletions: stats?.deletions ?? null,
        htmlUrl: `${link.repository.htmlUrl}/commit/${commit.sha}`,
      };
    }),
  };
}

/** Returns the live project GitHub repository my commits. */
export async function listLiveProjectGithubRepositoryMyCommits(
  userId: number,
  linkId: number,
  page = 1,
  perPage = 10,
  options?: { includeTotals?: boolean }
) {
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
  const safePage = Math.max(1, page);
  const safePerPage = Math.max(1, Math.min(20, perPage));
  const includeTotals = options?.includeTotals !== false;
  const commits = await fetchUserCommitsForRepositoryPage(
    accessToken,
    link.repository.fullName,
    account.login,
    safePage,
    safePerPage
  );
  const commitStatsBySha = await fetchCommitStatsForRepository(
    accessToken,
    link.repository.fullName,
    commits.map((commit) => commit.sha)
  );
  let totals: {
    commits: number;
    mergePullRequestCommits: number;
    additionsExcludingMergePullRequests: number;
    deletionsExcludingMergePullRequests: number;
    additionsIncludingMergePullRequests: number;
    deletionsIncludingMergePullRequests: number;
    detailedCommitCount: number;
    requestedCommitCount: number;
  } | null = null;

  if (includeTotals) {
    const allUserCommits = await fetchAllUserCommitsForRepository(accessToken, link.repository.fullName, account.login);
    const allCommitStatsBySha = await fetchCommitStatsForRepository(
      accessToken,
      link.repository.fullName,
      allUserCommits.map((commit) => commit.sha),
      allUserCommits.length
    );

    let additionsIncludingMerges = 0;
    let deletionsIncludingMerges = 0;
    let additionsExcludingMergePullRequests = 0;
    let deletionsExcludingMergePullRequests = 0;
    let mergePullRequestCommitCount = 0;
    for (const commit of allUserCommits) {
      const stats = allCommitStatsBySha.get(commit.sha);
      const additions = stats?.additions ?? 0;
      const deletions = stats?.deletions ?? 0;
      const isMergePullRequest = isMergePullRequestCommit(commit);
      if (isMergePullRequest) {
        mergePullRequestCommitCount += 1;
      }
      additionsIncludingMerges += additions;
      deletionsIncludingMerges += deletions;
      if (!isMergePullRequest) {
        additionsExcludingMergePullRequests += additions;
        deletionsExcludingMergePullRequests += deletions;
      }
    }

    totals = {
      commits: allUserCommits.length,
      mergePullRequestCommits: mergePullRequestCommitCount,
      additionsExcludingMergePullRequests,
      deletionsExcludingMergePullRequests,
      additionsIncludingMergePullRequests: additionsIncludingMerges,
      deletionsIncludingMergePullRequests: deletionsIncludingMerges,
      detailedCommitCount: allCommitStatsBySha.size,
      requestedCommitCount: allUserCommits.length,
    };
  }

  return {
    linkId: link.id,
    repository: {
      id: link.repository.id,
      fullName: link.repository.fullName,
      defaultBranch: link.repository.defaultBranch || "main",
      htmlUrl: link.repository.htmlUrl,
    },
    githubLogin: account.login,
    page: safePage,
    perPage: safePerPage,
    hasNextPage: commits.length === safePerPage,
    totals,
    commits: commits.map((commit) => {
      const stats = commitStatsBySha.get(commit.sha);
      const isMergePullRequest = isMergePullRequestCommit(commit);
      return {
        sha: commit.sha,
        message: commit.commit.message || "",
        date: commit.commit.author?.date || null,
        authorLogin: commit.author?.login || null,
        authorEmail: commit.commit.author?.email || null,
        additions: stats?.additions ?? null,
        deletions: stats?.deletions ?? null,
        isMergePullRequest,
        htmlUrl: `${link.repository.htmlUrl}/commit/${commit.sha}`,
      };
    }),
  };
}

/** Removes the project GitHub repository link. */
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
