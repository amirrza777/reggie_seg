import { findLatestGithubSnapshotByProjectLinkId } from "./repo.js";
import { contributorKeyFromCommit, toUtcDayKey, type GithubCommitListItem } from "./service.analysis.fetch.js";

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

export function isMergePullRequestCommit(commit: GithubCommitListItem) {
  const message = (commit.commit.message || "").trim().toLowerCase();
  return message.startsWith("merge pull request");
}

export function aggregateCommitData(commits: GithubCommitListItem[], defaultBranch: string) {
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

export type CountMap = Record<string, number>;
export type LineChangeMap = Record<string, { additions: number; deletions: number }>;

export type SnapshotUserStatRecord = {
  mappedUserId: number | null;
  contributorKey: string;
  githubUserId: bigint | null;
  githubLogin: string | null;
  authorEmail: string | null;
  isMatched: boolean;
  commits: number;
  additions: number;
  deletions: number;
  commitsByDay: Record<string, number>;
  commitsByBranch: Record<string, number>;
  firstCommitAt: Date | null;
  lastCommitAt: Date | null;
};

export type SnapshotUserStatRow = Omit<SnapshotUserStatRecord, "commitsByDay" | "commitsByBranch"> & {
  commitsByDay: unknown;
  commitsByBranch: unknown;
};

export type PreviousSnapshotData = {
  analysedWindow?: {
    since?: string;
    until?: string;
  };
  timeSeries?: {
    defaultBranch?: { lineChangesByDay?: LineChangeMap };
    allBranches?: { lineChangesByDay?: LineChangeMap };
  };
  commitCount?: number;
  commitStatsCoverage?: {
    detailedCommitCount?: number;
    requestedCommitCount?: number;
  };
  branchScopeStats?: {
    defaultBranch?: {
      branch?: string;
      totalCommits?: number;
      totalAdditions?: number;
      totalDeletions?: number;
    };
    allBranches?: {
      branchCount?: number;
      totalCommits?: number;
      totalAdditions?: number;
      totalDeletions?: number;
      commitsByBranch?: CountMap;
      commitStatsCoverage?: {
        detailedCommitCount?: number;
        requestedCommitCount?: number;
      };
    };
  };
  sampleCommits?: Array<{
    sha?: string;
    date?: string | null;
    login?: string | null;
    email?: string | null;
  }>;
};

export function mergeCountMaps(left: CountMap = {}, right: CountMap = {}) {
  const merged: CountMap = { ...left };
  for (const [key, value] of Object.entries(right)) {
    merged[key] = (merged[key] || 0) + value;
  }
  return merged;
}

export function mergeLineChangeMaps(left: LineChangeMap = {}, right: LineChangeMap = {}) {
  const merged: LineChangeMap = { ...left };
  for (const [key, value] of Object.entries(right)) {
    const existing = merged[key] || { additions: 0, deletions: 0 };
    merged[key] = {
      additions: existing.additions + value.additions,
      deletions: existing.deletions + value.deletions,
    };
  }
  return merged;
}

export function mergeUserStats(
  previousUserStats: SnapshotUserStatRow[],
  newUserStats: SnapshotUserStatRecord[]
) {
  const mergedByKey = new Map<string, SnapshotUserStatRecord>();

  for (const prev of previousUserStats) {
    mergedByKey.set(prev.contributorKey, {
      mappedUserId: prev.mappedUserId,
      contributorKey: prev.contributorKey,
      githubUserId: prev.githubUserId,
      githubLogin: prev.githubLogin,
      authorEmail: prev.authorEmail,
      isMatched: prev.isMatched,
      commits: prev.commits,
      additions: prev.additions,
      deletions: prev.deletions,
      commitsByDay: { ...(((prev.commitsByDay as CountMap | null) ?? {})) },
      commitsByBranch: { ...(((prev.commitsByBranch as CountMap | null) ?? {})) },
      firstCommitAt: prev.firstCommitAt,
      lastCommitAt: prev.lastCommitAt,
    });
  }

  for (const newStat of newUserStats) {
    const existing = mergedByKey.get(newStat.contributorKey);
    if (!existing) {
      mergedByKey.set(newStat.contributorKey, { ...newStat });
      continue;
    }

    existing.mappedUserId = newStat.mappedUserId ?? existing.mappedUserId;
    existing.githubUserId = newStat.githubUserId ?? existing.githubUserId;
    existing.githubLogin = newStat.githubLogin ?? existing.githubLogin;
    existing.authorEmail = newStat.authorEmail ?? existing.authorEmail;
    existing.isMatched = newStat.isMatched || existing.isMatched;
    existing.commits += newStat.commits;
    existing.additions += newStat.additions;
    existing.deletions += newStat.deletions;
    existing.commitsByDay = mergeCountMaps(existing.commitsByDay, newStat.commitsByDay);
    existing.commitsByBranch = mergeCountMaps(existing.commitsByBranch, newStat.commitsByBranch);

    if (!existing.firstCommitAt || (newStat.firstCommitAt && newStat.firstCommitAt < existing.firstCommitAt)) {
      existing.firstCommitAt = newStat.firstCommitAt;
    }
    if (!existing.lastCommitAt || (newStat.lastCommitAt && newStat.lastCommitAt > existing.lastCommitAt)) {
      existing.lastCommitAt = newStat.lastCommitAt;
    }
  }

  return Array.from(mergedByKey.values());
}

export function mergeSampleCommits(
  previousSamples: PreviousSnapshotData["sampleCommits"] | undefined,
  newCommits: GithubCommitListItem[]
) {
  const newSamples = newCommits.slice(0, 200).map((commit) => ({
    sha: commit.sha,
    date: commit.commit.author?.date || null,
    login: commit.author?.login || null,
    email: commit.commit.author?.email || null,
  }));

  const merged: Array<{ sha: string; date: string | null; login: string | null; email: string | null }> = [];
  const seen = new Set<string>();

  for (const sample of [...newSamples, ...(previousSamples || [])]) {
    if (!sample?.sha || seen.has(sample.sha)) {
      continue;
    }
    seen.add(sample.sha);
    merged.push({
      sha: sample.sha,
      date: sample.date ?? null,
      login: sample.login ?? null,
      email: sample.email ?? null,
    });
    if (merged.length >= 200) {
      break;
    }
  }

  return merged;
}

export function filterCommitsAfter(
  commits: GithubCommitListItem[],
  cutoff: Date | null
) {
  if (!cutoff) {
    return commits;
  }
  return commits.filter((commit) => {
    const rawDate = commit.commit.author?.date;
    if (!rawDate) {
      return false;
    }
    const parsed = new Date(rawDate);
    return !Number.isNaN(parsed.getTime()) && parsed > cutoff;
  });
}

export function hasUsableRepoCommitsByDay(latestSnapshot: Awaited<ReturnType<typeof findLatestGithubSnapshotByProjectLinkId>> | null) {
  const repoStat = latestSnapshot?.repoStats?.[0];
  if (!repoStat) {
    return false;
  }
  const totalCommits = repoStat.totalCommits ?? 0;
  const commitsByDay = repoStat.commitsByDay as CountMap | null | undefined;
  const hasCommitDays = !!commitsByDay && typeof commitsByDay === "object" && Object.keys(commitsByDay).length > 0;
  return totalCommits === 0 || hasCommitDays;
}
