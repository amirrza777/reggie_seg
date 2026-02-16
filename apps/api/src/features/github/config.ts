const GITHUB_API_BASE_URL = "https://api.github.com";
const DEFAULT_GITHUB_OAUTH_SCOPES = ["read:user", "user:email", "repo"] as const;

export type GitHubOAuthConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
};

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

export function getGitHubApiConfig() {
  return {
    baseUrl: process.env.GITHUB_API_BASE_URL || GITHUB_API_BASE_URL,
    appToken: process.env.GITHUB_TOKEN || null,
  };
}
