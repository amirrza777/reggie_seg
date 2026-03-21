import { aggregateLineChangesByDay } from "./analysis.helpers.js";
import { GithubServiceError } from "./errors.js";
import { getValidGithubAccessToken } from "./oauth.service.js";
import {
  createGithubSnapshot,
  findGithubAccountByUserId,
  findLatestGithubSnapshotByProjectLinkId,
  findProjectGithubRepositoryLinkById,
  isUserInProject,
  listProjectGithubIdentityCandidates,
} from "./repo.js";
import {
  contributorKeyFromCommit,
  fetchBranchCommitCount,
  fetchCommitStatsForRepository,
  fetchCommitsForLinkedRepository,
  listRepositoryBranches,
  type GithubCommitListItem,
} from "./service.analysis.fetch.js";
import {
  aggregateCommitData,
  filterCommitsAfter,
  hasUsableRepoCommitsByDay,
  mergeCountMaps,
  mergeLineChangeMaps,
  mergeSampleCommits,
  mergeUserStats,
  type CountMap,
  type PreviousSnapshotData,
  type SnapshotUserStatRecord,
  type SnapshotUserStatRow,
} from "./service.analysis.aggregate.js";

type IdentityCandidate = {
  userId: number;
};

function parseIsoDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}

function hasCompleteCommitStatsCoverage(
  coverage:
    | {
        detailedCommitCount?: number;
        requestedCommitCount?: number;
      }
    | null
    | undefined
) {
  const requested = Number(coverage?.requestedCommitCount ?? 0);
  if (requested <= 0) {
    return true;
  }
  const detailed = Number(coverage?.detailedCommitCount ?? 0);
  return detailed >= requested;
}

function hasIncompleteSnapshotCommitStatsCoverage(data: PreviousSnapshotData | null | undefined) {
  if (!data) {
    return false;
  }
  return (
    !hasCompleteCommitStatsCoverage(data.commitStatsCoverage) ||
    !hasCompleteCommitStatsCoverage(data.branchScopeStats?.allBranches?.commitStatsCoverage)
  );
}

function addUniqueUserId(userIds: number[], value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value) || userIds.includes(value)) {
    return;
  }
  userIds.push(value);
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

/** Runs repository analysis for a project-linked GitHub repository. */
export async function analyseProjectGithubRepository(userId: number, linkId: number) {
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
  const latestSnapshot = await findLatestGithubSnapshotByProjectLinkId(link.id);
  const useLatestSnapshotAsBaseline = hasUsableRepoCommitsByDay(latestSnapshot);
  const latestSnapshotData = (latestSnapshot?.data ?? null) as PreviousSnapshotData | null;
  const shouldBackfillFromWindowStart =
    useLatestSnapshotAsBaseline && hasIncompleteSnapshotCommitStatsCoverage(latestSnapshotData);
  const backfillWindowStart = shouldBackfillFromWindowStart
    ? parseIsoDate(latestSnapshotData?.analysedWindow?.since)
    : null;
  const shouldRebuildFromBackfillWindow = Boolean(backfillWindowStart);
  const baselineSnapshot =
    useLatestSnapshotAsBaseline && !shouldRebuildFromBackfillWindow ? latestSnapshot : null;
  const previousAnalysedAt = baselineSnapshot?.analysedAt ?? null;
  const now = new Date();
  const sinceDate = backfillWindowStart ?? previousAnalysedAt;
  const sinceIso = sinceDate?.toISOString() ?? null;
  const commits = filterCommitsAfter(
    await fetchCommitsForLinkedRepository(accessToken, link.repository.fullName, defaultBranch, sinceIso),
    previousAnalysedAt
  );
  const branchNames = await listRepositoryBranches(accessToken, link.repository.fullName);
  const allBranchNames = branchNames.length > 0 ? branchNames : [defaultBranch];
  const allBranchCommitBySha = new Map<string, GithubCommitListItem>();
  const allBranchCommitCountByBranch: Record<string, number> = {};
  for (const branchName of allBranchNames) {
    const branchCommits = filterCommitsAfter(
      await fetchCommitsForLinkedRepository(
        accessToken,
        link.repository.fullName,
        branchName,
        sinceIso
      ),
      previousAnalysedAt
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
  const defaultBranchLineChangesByDay = aggregateLineChangesByDay(commits, commitStatsBySha);
  const allBranchesLineChangesByDay = aggregateLineChangesByDay(allBranchCommits, allBranchCommitStatsBySha);

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

  const newAllBranchesTotalCommits = allBranchCommits.length;
  const previousData = (baselineSnapshot?.data ?? {}) as PreviousSnapshotData;

  const mergedUserStats = baselineSnapshot
    ? mergeUserStats(baselineSnapshot.userStats as SnapshotUserStatRow[], userStats as SnapshotUserStatRecord[])
    : (userStats as SnapshotUserStatRecord[]);

  const mergedTotalCommits = mergedUserStats.reduce((sum, stat) => sum + stat.commits, 0);
  const mergedTotalAdditions = mergedUserStats.reduce((sum, stat) => sum + stat.additions, 0);
  const mergedTotalDeletions = mergedUserStats.reduce((sum, stat) => sum + stat.deletions, 0);
  const mergedMatchedContributors = mergedUserStats.filter((stat) => stat.isMatched).length;
  const mergedUnmatchedContributors = mergedUserStats.length - mergedMatchedContributors;
  const mergedUnmatchedCommits = mergedUserStats
    .filter((stat) => !stat.isMatched)
    .reduce((sum, stat) => sum + stat.commits, 0);

  const previousRepoStats = baselineSnapshot?.repoStats?.[0] ?? null;
  const mergedRepoCommitsByDay = mergeCountMaps(
    ((previousRepoStats?.commitsByDay as CountMap | undefined) ?? {}),
    aggregated.repoCommitsByDay
  );
  const mergedRepoCommitsByBranch = mergeCountMaps(
    ((previousRepoStats?.commitsByBranch as CountMap | undefined) ?? {}),
    aggregated.repoCommitsByBranch
  );
  const mergedDefaultBranchCommits = await fetchBranchCommitCount(
    accessToken,
    link.repository.fullName,
    defaultBranch
  );

  const previousAllBranchesStats = previousData?.branchScopeStats?.allBranches;
  const previousDefaultLineChanges = previousData.timeSeries?.defaultBranch?.lineChangesByDay ?? {};
  const previousAllBranchesLineChanges = previousData.timeSeries?.allBranches?.lineChangesByDay ?? {};
  const mergedDefaultLineChangesByDay = mergeLineChangeMaps(previousDefaultLineChanges, defaultBranchLineChangesByDay);
  const mergedAllBranchesLineChangesByDay = mergeLineChangeMaps(previousAllBranchesLineChanges, allBranchesLineChangesByDay);
  const mergedDefaultLineTotals = Object.values(mergedDefaultLineChangesByDay).reduce(
    (totals, row) => ({
      additions: totals.additions + Number(row?.additions ?? 0),
      deletions: totals.deletions + Number(row?.deletions ?? 0),
    }),
    { additions: 0, deletions: 0 }
  );
  const mergedAllBranchesLineTotals = Object.values(mergedAllBranchesLineChangesByDay).reduce(
    (totals, row) => ({
      additions: totals.additions + Number(row?.additions ?? 0),
      deletions: totals.deletions + Number(row?.deletions ?? 0),
    }),
    { additions: 0, deletions: 0 }
  );

  const previousCommitStatsCoverage = previousData.commitStatsCoverage;
  const previousAllBranchesCommitStatsCoverage = previousAllBranchesStats?.commitStatsCoverage;
  const previousAllBranchesCommitsByBranch = previousAllBranchesStats?.commitsByBranch ?? {};
  const mergedAllBranchesCommitsByBranch = mergeCountMaps(previousAllBranchesCommitsByBranch, allBranchCommitCountByBranch);

  const previousAllBranchesTotalCommits = previousAllBranchesStats?.totalCommits ?? previousRepoStats?.totalCommits ?? 0;
  const mergedAllBranchesTotalCommits = Math.max(
    mergedDefaultBranchCommits,
    previousAllBranchesTotalCommits + newAllBranchesTotalCommits
  );
  const mergedAllBranchesTotalAdditions = Math.max(
    mergedDefaultLineTotals.additions,
    mergedAllBranchesLineTotals.additions
  );
  const mergedAllBranchesTotalDeletions = Math.max(
    mergedDefaultLineTotals.deletions,
    mergedAllBranchesLineTotals.deletions
  );
  const mergedSampleCommits = mergeSampleCommits(previousData.sampleCommits, commits);
  const analysedWindowSinceIso = sinceIso ?? previousData?.analysedWindow?.since ?? null;

  const finalSnapshotData = {
    repository: {
      id: link.repository.id,
      fullName: link.repository.fullName,
      htmlUrl: link.repository.htmlUrl,
      ownerLogin: link.repository.ownerLogin,
      defaultBranch,
    },
    analysedWindow: {
      since: analysedWindowSinceIso,
      until: now.toISOString(),
    },
    timeSeries: {
      defaultBranch: {
        lineChangesByDay: mergedDefaultLineChangesByDay,
      },
      allBranches: {
        lineChangesByDay: mergedAllBranchesLineChangesByDay,
      },
    },
    commitCount: mergedDefaultBranchCommits,
    commitStatsCoverage: {
      detailedCommitCount: (previousCommitStatsCoverage?.detailedCommitCount ?? 0) + commitStatsBySha.size,
      requestedCommitCount: (previousCommitStatsCoverage?.requestedCommitCount ?? 0) + commits.length,
    },
    branchScopeStats: {
      defaultBranch: {
        branch: defaultBranch,
        totalCommits: mergedDefaultBranchCommits,
        totalAdditions: mergedDefaultLineTotals.additions,
        totalDeletions: mergedDefaultLineTotals.deletions,
      },
      allBranches: {
        branchCount: allBranchNames.length,
        totalCommits: mergedAllBranchesTotalCommits,
        totalAdditions: mergedAllBranchesTotalAdditions,
        totalDeletions: mergedAllBranchesTotalDeletions,
        commitsByBranch: mergedAllBranchesCommitsByBranch,
        commitStatsCoverage: {
          detailedCommitCount: (previousAllBranchesCommitStatsCoverage?.detailedCommitCount ?? 0) + allBranchCommitStatsBySha.size,
          requestedCommitCount: (previousAllBranchesCommitStatsCoverage?.requestedCommitCount ?? 0) + allBranchCommits.length,
        },
      },
    },
    sampleCommits: mergedSampleCommits,
  };

  const snapshot = await createGithubSnapshot({
    projectGithubRepositoryId: link.id,
    analysedByUserId: userId,
    nextSyncIntervalMinutes: link.syncIntervalMinutes || 60,
    data: finalSnapshotData,
    userStats: mergedUserStats,
    repoStat: {
      totalCommits: mergedTotalCommits,
      totalAdditions: mergedTotalAdditions,
      totalDeletions: mergedTotalDeletions,
      totalContributors: mergedUserStats.length,
      matchedContributors: mergedMatchedContributors,
      unmatchedContributors: mergedUnmatchedContributors,
      unmatchedCommits: mergedUnmatchedCommits,
      defaultBranchCommits: mergedDefaultBranchCommits,
      commitsByDay: mergedRepoCommitsByDay,
      commitsByBranch: mergedRepoCommitsByBranch,
    },
  });

  return snapshot;
}
