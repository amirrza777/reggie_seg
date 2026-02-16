export type GithubConnectionStatus = {
  connected: boolean;
  account: {
    userId: number;
    login: string;
    email: string | null;
    scopes: string | null;
    tokenType: string | null;
    accessTokenExpiresAt: string | null;
    refreshTokenExpiresAt: string | null;
    tokenLastRefreshedAt: string | null;
    createdAt: string;
    updatedAt: string;
  } | null;
};

export type GithubRepositoryOption = {
  githubRepoId: number;
  name: string;
  fullName: string;
  htmlUrl: string;
  isPrivate: boolean;
  ownerLogin: string | null;
  defaultBranch: string | null;
};

export type ProjectGithubRepoLink = {
  id: number;
  projectId: number;
  githubRepositoryId: number;
  linkedByUserId: number;
  isActive: boolean;
  autoSyncEnabled: boolean;
  syncIntervalMinutes: number;
  lastSyncedAt: string | null;
  nextSyncAt: string | null;
  createdAt: string;
  updatedAt: string;
  repository: {
    id: number;
    githubRepoId: number;
    ownerLogin: string;
    name: string;
    fullName: string;
    htmlUrl: string;
    isPrivate: boolean;
    defaultBranch: string | null;
    pushedAt: string | null;
    updatedAt: string;
  };
};

export type GithubMappingCoverage = {
  linkId: number;
  snapshotId: number | null;
  analysedAt: string | null;
  coverage: {
    totalContributors: number;
    matchedContributors: number;
    unmatchedContributors: number;
    totalCommits: number;
    unmatchedCommits: number;
  } | null;
};
