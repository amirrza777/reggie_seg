import { beforeEach, describe, expect, it, vi } from "vitest";
import jwt from "jsonwebtoken";

const configMocks = vi.hoisted(() => ({
  getGitHubAppConfig: vi.fn(),
}));

const repoMocks = vi.hoisted(() => ({
  findGithubAccountByGithubUserId: vi.fn(),
  findUserById: vi.fn(),
  updateGithubAccountTokens: vi.fn(),
  upsertGithubAccount: vi.fn(),
}));

vi.mock("./config.js", () => ({ getGitHubAppConfig: configMocks.getGitHubAppConfig }));
vi.mock("./repo.js", () => repoMocks);

import { buildGithubConnectUrl, validateGithubCallback } from "./oauth.service.js";

describe("oauth.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GITHUB_OAUTH_STATE_SECRET = "test-oauth-state-secret";
    process.env.APP_BASE_URL = "http://127.0.0.1:3001";
    configMocks.getGitHubAppConfig.mockReturnValue({
      clientId: "Iv123",
      clientSecret: "secret",
      redirectUri: "http://127.0.0.1:3000/github/callback",
      appId: 1,
      privateKeyPem: "pem",
      webhookSecret: null,
    });
    repoMocks.findUserById.mockResolvedValue({ id: 7 });
  });

  it("builds a github connect URL and preserves an allowed absolute returnTo", async () => {
    const url = await buildGithubConnectUrl(7, "http://127.0.0.1:3001/projects/1/repos?tab=configurations");
    const parsed = new URL(url);

    expect(parsed.origin + parsed.pathname).toBe("https://github.com/login/oauth/authorize");
    expect(parsed.searchParams.get("client_id")).toBe("Iv123");
    expect(parsed.searchParams.get("redirect_uri")).toBe("http://127.0.0.1:3000/github/callback");
    expect(parsed.searchParams.get("allow_signup")).toBe("false");

    const state = parsed.searchParams.get("state");
    expect(state).toBeTruthy();
    const decoded = jwt.verify(state!, process.env.GITHUB_OAUTH_STATE_SECRET!) as {
      sub: number;
      nonce: string;
      returnTo?: string;
    };
    expect(decoded.sub).toBe(7);
    expect(decoded.nonce).toMatch(/^[a-f0-9]{32}$/);
    expect(decoded.returnTo).toBe("http://127.0.0.1:3001/projects/1/repos?tab=configurations");
  });

  it("drops unsafe returnTo values and validates callback state", async () => {
    const connectUrl = await buildGithubConnectUrl(7, "https://evil.example/phish");
    const state = new URL(connectUrl).searchParams.get("state")!;

    const validated = validateGithubCallback("oauth-code", state);
    expect(validated).toEqual({
      code: "oauth-code",
      userId: 7,
      returnTo: null,
    });
  });

  it("rejects invalid callback state and missing app config for connect URL", async () => {
    expect(() => validateGithubCallback("code", "not-a-jwt")).toThrowError(/Invalid OAuth state/);

    configMocks.getGitHubAppConfig.mockReturnValueOnce(null);
    await expect(buildGithubConnectUrl(7, "/projects/1/repos")).rejects.toMatchObject({
      status: 503,
      message: "GitHub App auth is not configured",
    });
  });
});
