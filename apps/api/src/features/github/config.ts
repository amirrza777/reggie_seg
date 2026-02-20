const GITHUB_API_BASE_URL = "https://api.github.com";
const DEFAULT_GITHUB_OAUTH_SCOPES = ["read:user", "user:email", "public_repo"] as const;

export type GitHubAuthMode = "oauth_app" | "github_app";

export type GitHubOAuthConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
};

export type GitHubAppConfig = {
  appId: string;
  clientId: string;
  clientSecret: string;
  privateKey: string;
  redirectUri: string;
  webhookSecret: string | null;
};

export function getGitHubAuthMode(): GitHubAuthMode {
  const mode = (process.env.GITHUB_AUTH_MODE || "github_app").trim().toLowerCase();
  return mode === "github_app" ? "github_app" : "oauth_app";
}

export function getGitHubOAuthConfig(): GitHubOAuthConfig | null {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  const redirectUri = process.env.GITHUB_REDIRECT_URI;
  const scopes = process.env.GITHUB_OAUTH_SCOPES?.trim();

  if (!clientId || !clientSecret || !redirectUri) {
    return null;
  }

  return {
    clientId,
    clientSecret,
    redirectUri,
    scopes: scopes ? scopes.split(",").map((scope) => scope.trim()).filter(Boolean) : [...DEFAULT_GITHUB_OAUTH_SCOPES],
  };
}

export function getGitHubAppConfig(): GitHubAppConfig | null {
  const appId = process.env.GITHUB_APP_ID?.trim();
  const clientId = process.env.GITHUB_APP_CLIENT_ID?.trim();
  const clientSecret = process.env.GITHUB_APP_CLIENT_SECRET?.trim();
  const privateKeyRaw = process.env.GITHUB_APP_PRIVATE_KEY;
  const redirectUri = process.env.GITHUB_APP_REDIRECT_URI?.trim();
  const webhookSecret = process.env.GITHUB_APP_WEBHOOK_SECRET?.trim() || null;

  if (!appId || !clientId || !clientSecret || !privateKeyRaw || !redirectUri) {
    return null;
  }

  // Allow either literal newlines (multiline env) or escaped '\n' content.
  const privateKey = privateKeyRaw.includes("\\n")
    ? privateKeyRaw.replace(/\\n/g, "\n")
    : privateKeyRaw;

  return {
    appId,
    clientId,
    clientSecret,
    privateKey,
    redirectUri,
    webhookSecret,
  };
}

export function getGitHubApiConfig() {
  return {
    baseUrl: process.env.GITHUB_API_BASE_URL || GITHUB_API_BASE_URL,
    appToken: process.env.GITHUB_TOKEN || null,
  };
}
