import jwt from "jsonwebtoken";
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { getGitHubApiConfig, getGitHubOAuthConfig } from "./config.js";
import {
  createGithubSnapshot,
  findGithubAccountByGithubUserId,
  findGithubAccountByUserId,
  findProjectGithubRepositoryLinkById,
  findGithubSnapshotById,
  findLatestGithubSnapshotCoverageByProjectLinkId,
  findUserById,
  isUserInProject,
  listGithubSnapshotsByProjectLinkId,
  listProjectGithubRepositoryLinks,
  listProjectGithubIdentityCandidates,
  updateGithubAccountTokens,
  upsertGithubAccount,
  upsertGithubRepository,
  upsertProjectGithubRepositoryLink,
} from "./repo.js";

type GithubOAuthStatePayload = {
  sub: number;
  nonce: string;
};

class GithubServiceError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function getStateSecret() {
  return process.env.GITHUB_OAUTH_STATE_SECRET || process.env.JWT_ACCESS_SECRET || "";
}

export async function buildGithubOAuthConnectUrl(userId: number) {
  const oauth = getGitHubOAuthConfig();
  if (!oauth) {
    throw new GithubServiceError(503, "GitHub OAuth is not configured");
  }

  const user = await findUserById(userId);
  if (!user) {
    throw new GithubServiceError(404, "User not found");
  }

  const secret = getStateSecret();
  if (!secret) {
    throw new GithubServiceError(500, "OAuth state secret is not configured");
  }

  const state = jwt.sign(
    {
      sub: user.id,
      nonce: randomBytes(16).toString("hex"),
    } satisfies GithubOAuthStatePayload,
    secret,
    { expiresIn: "10m" }
  );

  const params = new URLSearchParams({
    client_id: oauth.clientId,
    redirect_uri: oauth.redirectUri,
    scope: oauth.scopes.join(" "),
    state,
    allow_signup: "false",
  });

  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}

export function validateGithubOAuthCallback(code: string, state: string) {
  const secret = getStateSecret();
  if (!secret) {
    throw new GithubServiceError(500, "OAuth state secret is not configured");
  }

  let payload: GithubOAuthStatePayload;
  try {
    payload = jwt.verify(state, secret) as GithubOAuthStatePayload;
  } catch {
    throw new GithubServiceError(400, "Invalid OAuth state");
  }

  if (!payload?.sub || !payload?.nonce) {
    throw new GithubServiceError(400, "Invalid OAuth state");
  }

  return {
    code,
    userId: payload.sub,
  };
}

type GithubTokenResponse = {
  access_token?: string;
  token_type?: string;
  scope?: string;
  refresh_token?: string;
  expires_in?: number;
  refresh_token_expires_in?: number;
  error?: string;
  error_description?: string;
};

type GithubRefreshTokenResponse = {
  access_token?: string;
  token_type?: string;
  scope?: string;
  refresh_token?: string;
  expires_in?: number;
  refresh_token_expires_in?: number;
  error?: string;
  error_description?: string;
};

type GithubUserProfile = {
  id: number;
  login: string;
  email: string | null;
};

function getTokenEncryptionKey() {
  const raw = process.env.GITHUB_TOKEN_ENCRYPTION_KEY || "";
  if (!raw) {
    throw new GithubServiceError(500, "GitHub token encryption key is not configured");
  }

  if (/^[a-f0-9]{64}$/i.test(raw)) {
    return Buffer.from(raw, "hex");
  }

  const base64 = Buffer.from(raw, "base64");
  if (base64.length === 32) {
    return base64;
  }

  const utf8 = Buffer.from(raw, "utf8");
  if (utf8.length === 32) {
    return utf8;
  }

  throw new GithubServiceError(500, "GitHub token encryption key must decode to 32 bytes");
}

function encryptToken(plainToken: string) {
  const key = getTokenEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plainToken, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${encrypted.toString("base64")}.${authTag.toString("base64")}`;
}

function decryptToken(encryptedToken: string) {
  const key = getTokenEncryptionKey();
  const parts = encryptedToken.split(".");
  if (parts.length !== 3) {
    throw new GithubServiceError(500, "Stored GitHub token has invalid format");
  }

  const ivBase64 = parts[0] || "";
  const payloadBase64 = parts[1] || "";
  const authTagBase64 = parts[2] || "";
  const iv = Buffer.from(ivBase64, "base64");
  const payload = Buffer.from(payloadBase64, "base64");
  const authTag = Buffer.from(authTagBase64, "base64");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(payload), decipher.final()]);
  return decrypted.toString("utf8");
}

function addSecondsToNow(seconds?: number) {
  if (!seconds || seconds <= 0) {
    return null;
  }
  return new Date(Date.now() + seconds * 1000);
}

async function exchangeGithubOAuthCode(code: string, state: string) {
  const oauth = getGitHubOAuthConfig();
  if (!oauth) {
    throw new GithubServiceError(503, "GitHub OAuth is not configured");
  }

  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: oauth.clientId,
      client_secret: oauth.clientSecret,
      code,
      redirect_uri: oauth.redirectUri,
      state,
    }),
  });

  if (!response.ok) {
    throw new GithubServiceError(502, "Failed to exchange GitHub OAuth code");
  }

  const data = (await response.json()) as GithubTokenResponse;
  if (!data.access_token) {
    throw new GithubServiceError(400, data.error_description || data.error || "GitHub access token missing");
  }

  return data;
}

async function refreshGithubAccessToken(refreshToken: string) {
  const oauth = getGitHubOAuthConfig();
  if (!oauth) {
    throw new GithubServiceError(503, "GitHub OAuth is not configured");
  }

  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: oauth.clientId,
      client_secret: oauth.clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new GithubServiceError(502, "Failed to refresh GitHub access token");
  }

  const data = (await response.json()) as GithubRefreshTokenResponse;
  if (!data.access_token) {
    throw new GithubServiceError(401, data.error_description || data.error || "GitHub refresh token is invalid");
  }

  return data;
}

async function fetchGithubUser(accessToken: string) {
  const profileResponse = await fetch("https://api.github.com/user", {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${accessToken}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (!profileResponse.ok) {
    throw new GithubServiceError(502, "Failed to fetch GitHub user profile");
  }

  const profile = (await profileResponse.json()) as GithubUserProfile;

  let primaryEmail = profile.email;
  if (!primaryEmail) {
    const emailsResponse = await fetch("https://api.github.com/user/emails", {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${accessToken}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (emailsResponse.ok) {
      const emails = (await emailsResponse.json()) as Array<{ email: string; primary: boolean; verified: boolean }>;
      const preferred = emails.find((email) => email.primary && email.verified) || emails.find((email) => email.verified);
      primaryEmail = preferred?.email ?? null;
    }
  }

  if (!profile?.id || !profile?.login) {
    throw new GithubServiceError(502, "Invalid GitHub user profile response");
  }

  return {
    id: profile.id,
    login: profile.login,
    email: primaryEmail || null,
  };
}

export async function connectGithubAccount(code: string, state: string) {
  const validated = validateGithubOAuthCallback(code, state);
  const user = await findUserById(validated.userId);
  if (!user) {
    throw new GithubServiceError(404, "User not found");
  }

  const tokenResponse = await exchangeGithubOAuthCode(validated.code, state);
  const githubUser = await fetchGithubUser(tokenResponse.access_token);
  const existingGithubAccount = await findGithubAccountByGithubUserId(BigInt(githubUser.id));
  if (existingGithubAccount && existingGithubAccount.userId !== user.id) {
    throw new GithubServiceError(409, "This GitHub account is already linked to another user");
  }

  const account = await upsertGithubAccount({
    userId: user.id,
    githubUserId: BigInt(githubUser.id),
    login: githubUser.login,
    email: githubUser.email,
    accessTokenEncrypted: encryptToken(tokenResponse.access_token),
    refreshTokenEncrypted: tokenResponse.refresh_token ? encryptToken(tokenResponse.refresh_token) : null,
    tokenType: tokenResponse.token_type || null,
    scopes: tokenResponse.scope || null,
    accessTokenExpiresAt: addSecondsToNow(tokenResponse.expires_in),
    refreshTokenExpiresAt: addSecondsToNow(tokenResponse.refresh_token_expires_in),
  });

  return account;
}

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
  const { baseUrl } = getGitHubApiConfig();
  const repositories: GithubRepoResponse[] = [];
  let page = 1;

  while (true) {
    const response = await fetch(`${baseUrl}/user/repos?per_page=100&page=${page}&sort=updated&direction=desc`, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${accessToken}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new GithubServiceError(401, "GitHub access token is invalid or expired");
      }
      throw new GithubServiceError(502, "Failed to fetch GitHub repositories");
    }

    const pageData = (await response.json()) as GithubRepoResponse[];
    repositories.push(...pageData);

    if (pageData.length < 100) {
      break;
    }
    page += 1;
    if (page > 10) {
      break;
    }
  }

  return repositories;
}

type GithubAccountTokenState = {
  userId: number;
  accessTokenEncrypted: string;
  accessTokenExpiresAt: Date | null;
  refreshTokenEncrypted: string | null;
  refreshTokenExpiresAt: Date | null;
  tokenType: string | null;
  scopes: string | null;
};

async function getValidGithubAccessToken(account: GithubAccountTokenState) {
  const now = Date.now();
  const expiresAtMs = account.accessTokenExpiresAt ? account.accessTokenExpiresAt.getTime() : null;
  const refreshWindowMs = 2 * 60 * 1000;
  const accessTokenStillValid = !expiresAtMs || expiresAtMs - now > refreshWindowMs;

  if (accessTokenStillValid) {
    return decryptToken(account.accessTokenEncrypted);
  }

  if (!account.refreshTokenEncrypted) {
    throw new GithubServiceError(401, "GitHub access token expired and no refresh token is available");
  }

  if (account.refreshTokenExpiresAt && account.refreshTokenExpiresAt.getTime() <= now) {
    throw new GithubServiceError(401, "GitHub refresh token has expired");
  }

  const decryptedRefreshToken = decryptToken(account.refreshTokenEncrypted);
  const refreshed = await refreshGithubAccessToken(decryptedRefreshToken);
  const updated = await updateGithubAccountTokens({
    userId: account.userId,
    accessTokenEncrypted: encryptToken(refreshed.access_token),
    refreshTokenEncrypted: refreshed.refresh_token
      ? encryptToken(refreshed.refresh_token)
      : account.refreshTokenEncrypted,
    tokenType: refreshed.token_type || account.tokenType,
    scopes: refreshed.scope || account.scopes,
    accessTokenExpiresAt: addSecondsToNow(refreshed.expires_in),
    refreshTokenExpiresAt: refreshed.refresh_token_expires_in
      ? addSecondsToNow(refreshed.refresh_token_expires_in)
      : account.refreshTokenExpiresAt,
  });

  return decryptToken(updated.accessTokenEncrypted);
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

  return {
    link,
    repository,
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
  const commitStatsBySha = await fetchCommitStatsForRepository(
    accessToken,
    link.repository.fullName,
    commits.map((commit) => commit.sha)
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

export { GithubServiceError };
