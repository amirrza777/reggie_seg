import jwt from "jsonwebtoken";
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { getGitHubAppConfig, getGitHubAuthMode, getGitHubOAuthConfig } from "./config.js";
import {
  findGithubAccountByGithubUserId,
  findUserById,
  updateGithubAccountTokens,
  upsertGithubAccount,
} from "./repo.js";
import { GithubServiceError } from "./errors.js";

type GithubOAuthStatePayload = {
  sub: number;
  nonce: string;
  returnTo?: string;
};

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

type GithubAccountTokenState = {
  userId: number;
  accessTokenEncrypted: string;
  accessTokenExpiresAt: Date | null;
  refreshTokenEncrypted: string | null;
  refreshTokenExpiresAt: Date | null;
  tokenType: string | null;
  scopes: string | null;
};

function getStateSecret() {
  return process.env.GITHUB_OAUTH_STATE_SECRET || process.env.JWT_ACCESS_SECRET || "";
}

function normalizeReturnTo(value: string | null | undefined) {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return null;
  }
  return trimmed;
}

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

export async function buildGithubOAuthConnectUrl(userId: number, returnTo?: string | null) {
  const authMode = getGitHubAuthMode();
  const oauth = getGitHubOAuthConfig();
  const githubApp = getGitHubAppConfig();
  if (authMode === "github_app" && !githubApp) {
    throw new GithubServiceError(503, "GitHub App auth is not configured");
  }
  if (authMode === "oauth_app" && !oauth) {
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

  const normalizedReturnTo = normalizeReturnTo(returnTo);
  const state = jwt.sign(
    {
      sub: user.id,
      nonce: randomBytes(16).toString("hex"),
      ...(normalizedReturnTo ? { returnTo: normalizedReturnTo } : {}),
    } satisfies GithubOAuthStatePayload,
    secret,
    { expiresIn: "10m" }
  );

  const params = new URLSearchParams({
    client_id: authMode === "github_app" ? githubApp!.clientId : oauth!.clientId,
    redirect_uri: authMode === "github_app" ? githubApp!.redirectUri : oauth!.redirectUri,
    state,
    allow_signup: "false",
  });
  if (authMode === "oauth_app") {
    params.set("scope", oauth!.scopes.join(" "));
  }

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
    returnTo: normalizeReturnTo(payload.returnTo),
  };
}

async function exchangeGithubOAuthCode(code: string, state: string) {
  const authMode = getGitHubAuthMode();
  const oauth = getGitHubOAuthConfig();
  const githubApp = getGitHubAppConfig();
  if (authMode === "github_app" && !githubApp) {
    throw new GithubServiceError(503, "GitHub App auth is not configured");
  }
  if (authMode === "oauth_app" && !oauth) {
    throw new GithubServiceError(503, "GitHub OAuth is not configured");
  }

  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: authMode === "github_app" ? githubApp!.clientId : oauth!.clientId,
      client_secret: authMode === "github_app" ? githubApp!.clientSecret : oauth!.clientSecret,
      code,
      redirect_uri: authMode === "github_app" ? githubApp!.redirectUri : oauth!.redirectUri,
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
  const authMode = getGitHubAuthMode();
  const oauth = getGitHubOAuthConfig();
  const githubApp = getGitHubAppConfig();
  if (authMode === "github_app" && !githubApp) {
    throw new GithubServiceError(503, "GitHub App auth is not configured");
  }
  if (authMode === "oauth_app" && !oauth) {
    throw new GithubServiceError(503, "GitHub OAuth is not configured");
  }

  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: authMode === "github_app" ? githubApp!.clientId : oauth!.clientId,
      client_secret: authMode === "github_app" ? githubApp!.clientSecret : oauth!.clientSecret,
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

  return {
    account,
    returnTo: validated.returnTo,
  };
}

export async function getValidGithubAccessToken(account: GithubAccountTokenState) {
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
