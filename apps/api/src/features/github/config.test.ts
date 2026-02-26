import { afterEach, describe, expect, it } from "vitest";
import { getGitHubApiConfig, getGitHubAppConfig } from "./config.js";

const originalEnv = { ...process.env };

function resetGitHubEnv() {
  delete process.env.GITHUB_APP_ID;
  delete process.env.GITHUB_APP_CLIENT_ID;
  delete process.env.GITHUB_APP_CLIENT_SECRET;
  delete process.env.GITHUB_APP_PRIVATE_KEY;
  delete process.env.GITHUB_APP_REDIRECT_URI;
  delete process.env.GITHUB_APP_WEBHOOK_SECRET;
  delete process.env.GITHUB_API_BASE_URL;
  delete process.env.GITHUB_TOKEN;
}

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("getGitHubAppConfig", () => {
  it("returns null when required app fields are missing", () => {
    resetGitHubEnv();

    expect(getGitHubAppConfig()).toBeNull();
  });

  it("returns trimmed config and converts escaped newlines in private key", () => {
    resetGitHubEnv();
    process.env.GITHUB_APP_ID = " 123 ";
    process.env.GITHUB_APP_CLIENT_ID = " Iv1.test ";
    process.env.GITHUB_APP_CLIENT_SECRET = " secret ";
    process.env.GITHUB_APP_PRIVATE_KEY = "line1\\nline2";
    process.env.GITHUB_APP_REDIRECT_URI = " http://127.0.0.1:3000/github/callback ";
    process.env.GITHUB_APP_WEBHOOK_SECRET = " hook-secret ";

    expect(getGitHubAppConfig()).toEqual({
      appId: "123",
      clientId: "Iv1.test",
      clientSecret: "secret",
      privateKey: "line1\nline2",
      redirectUri: "http://127.0.0.1:3000/github/callback",
      webhookSecret: "hook-secret",
    });
  });

  it("keeps literal multiline private key and normalizes empty webhook secret to null", () => {
    resetGitHubEnv();
    process.env.GITHUB_APP_ID = "123";
    process.env.GITHUB_APP_CLIENT_ID = "Iv1.test";
    process.env.GITHUB_APP_CLIENT_SECRET = "secret";
    process.env.GITHUB_APP_PRIVATE_KEY = "line1\nline2";
    process.env.GITHUB_APP_REDIRECT_URI = "http://127.0.0.1:3000/github/callback";
    process.env.GITHUB_APP_WEBHOOK_SECRET = "   ";

    expect(getGitHubAppConfig()).toEqual({
      appId: "123",
      clientId: "Iv1.test",
      clientSecret: "secret",
      privateKey: "line1\nline2",
      redirectUri: "http://127.0.0.1:3000/github/callback",
      webhookSecret: null,
    });
  });
});

describe("getGitHubApiConfig", () => {
  it("returns defaults when optional env vars are not set", () => {
    resetGitHubEnv();

    expect(getGitHubApiConfig()).toEqual({
      baseUrl: "https://api.github.com",
      appToken: null,
    });
  });

  it("returns env overrides for api base url and app token", () => {
    resetGitHubEnv();
    process.env.GITHUB_API_BASE_URL = "https://github.example.test/api";
    process.env.GITHUB_TOKEN = "token-value";

    expect(getGitHubApiConfig()).toEqual({
      baseUrl: "https://github.example.test/api",
      appToken: "token-value",
    });
  });
});

