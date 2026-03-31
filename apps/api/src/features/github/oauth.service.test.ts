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

import {
  buildGithubConnectUrl,
  connectGithubAccount,
  getValidGithubAccessToken,
  validateGithubCallback,
} from "./oauth.service.js";

describe("oauth.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GITHUB_OAUTH_STATE_SECRET = "test-oauth-state-secret";
    process.env.APP_BASE_URL = "http://127.0.0.1:3001";
    process.env.GITHUB_TOKEN_ENCRYPTION_KEY = "12345678901234567890123456789012";
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

  it("rejects missing users and missing OAuth state secret when building connect URLs", async () => {
    repoMocks.findUserById.mockResolvedValueOnce(null);
    await expect(buildGithubConnectUrl(7, "/projects/1/repos")).rejects.toMatchObject({
      status: 404,
      message: "User not found",
    });

    process.env.GITHUB_OAUTH_STATE_SECRET = "";
    process.env.JWT_ACCESS_SECRET = "";
    await expect(buildGithubConnectUrl(7, "/projects/1/repos")).rejects.toMatchObject({
      status: 500,
      message: "OAuth state secret is not configured",
    });
  });

  it("connects a GitHub account after exchanging the callback and reading profile data", async () => {
    const connectUrl = await buildGithubConnectUrl(7, "/projects/1/repos");
    const state = new URL(connectUrl).searchParams.get("state")!;
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          access_token: "access-token",
          refresh_token: "refresh-token",
          token_type: "bearer",
          scope: "repo",
          expires_in: 3600,
          refresh_token_expires_in: 7200,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          id: 99,
          login: "adxmir",
          email: "adxmir@example.com",
        }),
      });
    vi.stubGlobal("fetch", fetchMock as any);
    repoMocks.findGithubAccountByGithubUserId.mockResolvedValue(null);
    repoMocks.upsertGithubAccount.mockResolvedValue({ id: 5, login: "adxmir" });

    const result = await connectGithubAccount("oauth-code", state);

    expect(repoMocks.upsertGithubAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 7,
        githubUserId: BigInt(99),
        login: "adxmir",
        email: "adxmir@example.com",
      }),
    );
    expect(result).toEqual({
      account: { id: 5, login: "adxmir" },
      returnTo: "/projects/1/repos",
    });
  });

  it("rejects linking a GitHub account that is already connected to another user", async () => {
    const connectUrl = await buildGithubConnectUrl(7, "/projects/1/repos");
    const state = new URL(connectUrl).searchParams.get("state")!;
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          access_token: "access-token",
          refresh_token: "refresh-token",
          token_type: "bearer",
          scope: "repo",
          expires_in: 3600,
          refresh_token_expires_in: 7200,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          id: 99,
          login: "adxmir",
          email: "adxmir@example.com",
        }),
      });
    vi.stubGlobal("fetch", fetchMock as any);
    repoMocks.findGithubAccountByGithubUserId.mockResolvedValue({ userId: 999 });

    await expect(connectGithubAccount("oauth-code", state)).rejects.toMatchObject({
      status: 409,
      message: "This GitHub account is already linked to another user",
    });
    expect(repoMocks.upsertGithubAccount).not.toHaveBeenCalled();
  });

  it("returns the stored access token while it is still valid", async () => {
    const connectUrl = await buildGithubConnectUrl(7, "/projects/1/repos");
    const state = new URL(connectUrl).searchParams.get("state")!;
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({
            access_token: "access-token",
            refresh_token: "refresh-token",
            token_type: "bearer",
            scope: "repo",
            expires_in: 3600,
            refresh_token_expires_in: 7200,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({
            id: 99,
            login: "adxmir",
            email: "adxmir@example.com",
          }),
        }) as any,
    );
    repoMocks.findGithubAccountByGithubUserId.mockResolvedValue(null);
    repoMocks.upsertGithubAccount.mockResolvedValue({ id: 5, login: "adxmir" });

    await connectGithubAccount("oauth-code", state);
    const storedAccount = repoMocks.upsertGithubAccount.mock.calls.at(-1)?.[0];

    await expect(
      getValidGithubAccessToken({
        ...storedAccount,
        userId: 7,
        accessTokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
      }),
    ).resolves.toBe("access-token");
    expect(repoMocks.updateGithubAccountTokens).not.toHaveBeenCalled();
  });

  it("rejects expired access tokens when no usable refresh token exists", async () => {
    const connectUrl = await buildGithubConnectUrl(7, "/projects/1/repos");
    const state = new URL(connectUrl).searchParams.get("state")!;
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({
            access_token: "access-token",
            refresh_token: "refresh-token",
            token_type: "bearer",
            scope: "repo",
            expires_in: 3600,
            refresh_token_expires_in: 7200,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({
            id: 99,
            login: "adxmir",
            email: "adxmir@example.com",
          }),
        }) as any,
    );
    repoMocks.findGithubAccountByGithubUserId.mockResolvedValue(null);
    repoMocks.upsertGithubAccount.mockResolvedValue({ id: 5, login: "adxmir" });

    await connectGithubAccount("oauth-code", state);
    const storedAccount = repoMocks.upsertGithubAccount.mock.calls.at(-1)?.[0];

    await expect(
      getValidGithubAccessToken({
        ...storedAccount,
        userId: 7,
        accessTokenExpiresAt: new Date(Date.now() + 30 * 1000),
        refreshTokenEncrypted: null,
        refreshTokenExpiresAt: null,
      }),
    ).rejects.toMatchObject({
      status: 401,
      message: "GitHub access token expired and no refresh token is available",
    });

    await expect(
      getValidGithubAccessToken({
        ...storedAccount,
        userId: 7,
        accessTokenExpiresAt: new Date(Date.now() + 30 * 1000),
        refreshTokenExpiresAt: new Date(Date.now() - 60 * 1000),
      }),
    ).rejects.toMatchObject({
      status: 401,
      message: "GitHub refresh token has expired",
    });
  });
});
