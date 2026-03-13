const GITHUB_API_BASE_URL = "https://api.github.com";

export type GitHubAppConfig = {
  appId: string;
  clientId: string;
  clientSecret: string;
  privateKey: string;
  redirectUri: string;
  webhookSecret: string | null;
};

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
