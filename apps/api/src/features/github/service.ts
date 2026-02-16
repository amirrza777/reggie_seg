import jwt from "jsonwebtoken";
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { getGitHubApiConfig, getGitHubOAuthConfig } from "./config.js";
import {
  findGithubAccountByGithubUserId,
  findGithubAccountByUserId,
  findUserById,
  isUserInProject,
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

  const [ivBase64, payloadBase64, authTagBase64] = parts;
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

export async function listGithubRepositoriesForUser(userId: number) {
  const account = await findGithubAccountByUserId(userId);
  if (!account) {
    throw new GithubServiceError(404, "GitHub account is not connected");
  }

  const accessToken = decryptToken(account.accessTokenEncrypted);
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

export { GithubServiceError };
