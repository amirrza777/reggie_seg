import { beforeEach, describe, expect, it, vi } from "vitest";

const useMock = vi.fn();
const strategyCtor = vi.fn();
const signUpWithProviderMock = vi.fn();

vi.mock("passport", () => ({ default: { use: useMock } }));
vi.mock("passport-google-oauth20", () => ({
  Strategy: class MockGoogleStrategy {
    constructor(options: any, verify: any) {
      strategyCtor(options, verify);
    }
  },
}));
vi.mock("./service.js", () => ({ signUpWithProvider: signUpWithProviderMock }));
vi.mock("../shared/db.js", () => ({ prisma: {} }));

describe("configureGoogle", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    delete process.env.GOOGLE_REDIRECT_URI;
  });

  it("returns false when env vars are missing", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { configureGoogle } = await import("./google.js");

    expect(configureGoogle()).toBe(false);
    expect(useMock).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
  });

  it("registers passport strategy when env vars are present", async () => {
    process.env.GOOGLE_CLIENT_ID = "id";
    process.env.GOOGLE_CLIENT_SECRET = "secret";
    process.env.GOOGLE_REDIRECT_URI = "http://localhost/callback";
    const { configureGoogle } = await import("./google.js");

    expect(configureGoogle()).toBe(true);
    expect(strategyCtor).toHaveBeenCalledWith(
      {
        clientID: "id",
        clientSecret: "secret",
        callbackURL: "http://localhost/callback",
      },
      expect.any(Function)
    );
    expect(useMock).toHaveBeenCalledTimes(1);
  });
});
