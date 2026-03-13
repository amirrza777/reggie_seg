export type GithubCommitForAggregation = {
  sha: string;
  commit: {
    author: {
      date: string;
    } | null;
  };
};

export type GithubCommitLineStats = Map<string, { additions: number; deletions: number }>;

export type LineChangeMap = Record<string, { additions: number; deletions: number }>;

function toUtcDayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function aggregateLineChangesByDay(
  commits: GithubCommitForAggregation[],
  commitStatsBySha: GithubCommitLineStats
): LineChangeMap {
  const byDay: LineChangeMap = {};

  for (const commit of commits) {
    if (!commit.commit.author?.date) {
      continue;
    }
    const commitDate = new Date(commit.commit.author.date);
    if (Number.isNaN(commitDate.getTime())) {
      continue;
    }

    const stats = commitStatsBySha.get(commit.sha);
    if (!stats) {
      continue;
    }

    const dayKey = toUtcDayKey(commitDate);
    const existing = byDay[dayKey] || { additions: 0, deletions: 0 };
    existing.additions += stats.additions || 0;
    existing.deletions += stats.deletions || 0;
    byDay[dayKey] = existing;
  }

  return byDay;
}
