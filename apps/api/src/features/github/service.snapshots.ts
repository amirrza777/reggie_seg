import { GithubServiceError } from "./errors.js";
import {
  findGithubSnapshotById,
  findLatestGithubSnapshotByProjectLinkId,
  findLatestGithubSnapshotCoverageByProjectLinkId,
  findProjectGithubRepositoryLinkById,
  isUserInProject,
  listGithubSnapshotsByProjectLinkId,
  updateProjectGithubRepositorySyncSettings,
} from "./repo.js";

/** Returns the project GitHub repository snapshots. */
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

/** Returns the project GitHub repository snapshot. */
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

/** Returns the latest project GitHub repository snapshot. */
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

/** Returns the project GitHub mapping coverage. */
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
  const repoStats = latest?.repoStats as
    | Array<{
        totalContributors: number;
        matchedContributors: number;
        unmatchedContributors: number;
        totalCommits: number;
        unmatchedCommits: number;
      }>
    | {
        totalContributors: number;
        matchedContributors: number;
        unmatchedContributors: number;
        totalCommits: number;
        unmatchedCommits: number;
      }
    | null
    | undefined;
  const repoStat = Array.isArray(repoStats) ? (repoStats[0] ?? null) : (repoStats ?? null);
  if (!latest || !repoStat) {
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
      totalContributors: repoStat.totalContributors,
      matchedContributors: repoStat.matchedContributors,
      unmatchedContributors: repoStat.unmatchedContributors,
      totalCommits: repoStat.totalCommits,
      unmatchedCommits: repoStat.unmatchedCommits,
    },
  };
}

type UpdateProjectGithubSyncSettingsInput = {
  autoSyncEnabled: boolean;
  syncIntervalMinutes: number;
};

/** Updates the project GitHub sync settings. */
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
