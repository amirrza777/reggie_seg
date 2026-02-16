import jwt from "jsonwebtoken";
import { randomBytes } from "crypto";
import { getGitHubOAuthConfig } from "./config.js";
import { findUserById } from "./repo.js";

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

export { GithubServiceError };
