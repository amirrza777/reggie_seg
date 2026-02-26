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
