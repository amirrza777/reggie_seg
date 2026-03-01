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
  const latestSnapshot = await findLatestGithubSnapshotByProjectLinkId(link.id);
  const useLatestSnapshotAsBaseline = hasUsableRepoCommitsByDay(latestSnapshot);
  const baselineSnapshot = useLatestSnapshotAsBaseline ? latestSnapshot : null;
  const previousAnalysedAt = baselineSnapshot?.analysedAt ?? null;
  const now = new Date();
  const fallbackSinceDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const sinceDate = previousAnalysedAt ?? fallbackSinceDate;
  const sinceIso = sinceDate.toISOString();
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

  const newTotalCommits = userStats.reduce((sum, stat) => sum + stat.commits, 0);
  const newTotalAdditions = userStats.reduce((sum, stat) => sum + stat.additions, 0);
  const newTotalDeletions = userStats.reduce((sum, stat) => sum + stat.deletions, 0);
  const newAllBranchesTotalCommits = allBranchCommits.length;
  const newAllBranchesTotalAdditions = Array.from(allBranchCommitStatsBySha.values()).reduce(
    (sum, stat) => sum + stat.additions,
    0
  );
  const newAllBranchesTotalDeletions = Array.from(allBranchCommitStatsBySha.values()).reduce(
    (sum, stat) => sum + stat.deletions,
    0
  );
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
  const mergedDefaultBranchCommits = (previousRepoStats?.defaultBranchCommits || 0) + newTotalCommits;

  const previousDefaultBranchStats = previousData?.branchScopeStats?.defaultBranch;
  const previousAllBranchesStats = previousData?.branchScopeStats?.allBranches;
  const previousDefaultLineChanges = previousData.timeSeries?.defaultBranch?.lineChangesByDay ?? {};
  const previousAllBranchesLineChanges = previousData.timeSeries?.allBranches?.lineChangesByDay ?? {};
  const mergedDefaultLineChangesByDay = mergeLineChangeMaps(previousDefaultLineChanges, defaultBranchLineChangesByDay);
  const mergedAllBranchesLineChangesByDay = mergeLineChangeMaps(previousAllBranchesLineChanges, allBranchesLineChangesByDay);

  const previousCommitCount = previousData.commitCount ?? previousRepoStats?.defaultBranchCommits ?? 0;
  const previousCommitStatsCoverage = previousData.commitStatsCoverage;
  const previousAllBranchesCommitStatsCoverage = previousAllBranchesStats?.commitStatsCoverage;
  const previousAllBranchesCommitsByBranch = previousAllBranchesStats?.commitsByBranch ?? {};
  const mergedAllBranchesCommitsByBranch = mergeCountMaps(previousAllBranchesCommitsByBranch, allBranchCommitCountByBranch);

  const previousAllBranchesTotalCommits = previousAllBranchesStats?.totalCommits ?? previousRepoStats?.totalCommits ?? 0;
  const previousAllBranchesTotalAdditions = previousAllBranchesStats?.totalAdditions ?? previousRepoStats?.totalAdditions ?? 0;
  const previousAllBranchesTotalDeletions = previousAllBranchesStats?.totalDeletions ?? previousRepoStats?.totalDeletions ?? 0;
  const mergedSampleCommits = mergeSampleCommits(previousData.sampleCommits, commits);

  const finalSnapshotData = {
    repository: {
      id: link.repository.id,
      fullName: link.repository.fullName,
      htmlUrl: link.repository.htmlUrl,
      ownerLogin: link.repository.ownerLogin,
      defaultBranch,
    },
    analysedWindow: {
      since: previousData?.analysedWindow?.since || fallbackSinceDate.toISOString(),
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
    commitCount: previousCommitCount + commits.length,
    commitStatsCoverage: {
      detailedCommitCount: (previousCommitStatsCoverage?.detailedCommitCount ?? 0) + commitStatsBySha.size,
      requestedCommitCount: (previousCommitStatsCoverage?.requestedCommitCount ?? 0) + commits.length,
    },
    branchScopeStats: {
      defaultBranch: {
        branch: defaultBranch,
        totalCommits: (previousDefaultBranchStats?.totalCommits ?? 0) + newTotalCommits,
        totalAdditions: (previousDefaultBranchStats?.totalAdditions ?? 0) + newTotalAdditions,
        totalDeletions: (previousDefaultBranchStats?.totalDeletions ?? 0) + newTotalDeletions,
      },
      allBranches: {
        branchCount: allBranchNames.length,
        totalCommits: previousAllBranchesTotalCommits + newAllBranchesTotalCommits,
        totalAdditions: previousAllBranchesTotalAdditions + newAllBranchesTotalAdditions,
        totalDeletions: previousAllBranchesTotalDeletions + newAllBranchesTotalDeletions,
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
