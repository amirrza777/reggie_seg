import { beforeEach, expect, it, vi } from "vitest";

const useMock = vi.fn();
const strategyCtor = vi.fn();
const signUpWithProviderMock = vi.fn();
const userFindFirstMock = vi.fn();
const GOOGLE_REDIRECT_URL = "http://localhost/callback";

vi.mock("passport", () => ({ default: { use: useMock } }));
vi.mock("passport-google-oauth20", () => ({
  Strategy: class MockGoogleStrategy {
    constructor(options: any, verify: any) {
      strategyCtor(options, verify);
    }
  },
}));
vi.mock("./service.js", () => ({
  signUpWithProvider: signUpWithProviderMock,
}));
vi.mock("../shared/db.js", () => ({ prisma: { user: { findFirst: userFindFirstMock } } }));

function setGoogleEnv() {
  process.env.GOOGLE_CLIENT_ID = "id";
  process.env.GOOGLE_CLIENT_SECRET = "secret";
  process.env.GOOGLE_REDIRECT_URI = GOOGLE_REDIRECT_URL;
}

async function configureGoogleAndGetVerifyCallback() {
  const { configureGoogle } = await import("./google.js");
  expect(configureGoogle()).toBe(true);
  return strategyCtor.mock.calls[0][1] as (
    accessToken: string,
    refreshToken: string,
    profile: { emails?: Array<{ value: string }>; name?: { givenName?: string; familyName?: string } },
    done: (error: unknown, user?: unknown) => void
  ) => Promise<void>;
}

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
  setGoogleEnv();
  const { configureGoogle } = await import("./google.js");

  expect(configureGoogle()).toBe(true);
  expect(strategyCtor).toHaveBeenCalledWith(
    {
      clientID: "id",
      clientSecret: "secret",
      callbackURL: GOOGLE_REDIRECT_URL,
    },
    expect.any(Function)
  );
  expect(useMock).toHaveBeenCalledTimes(1);
});

it("verify callback creates user via provider and calls done with user", async () => {
  setGoogleEnv();
  userFindFirstMock.mockResolvedValueOnce({ id: 11 });
  signUpWithProviderMock.mockResolvedValueOnce({ id: 5, email: "user@example.com" });

  const verify = await configureGoogleAndGetVerifyCallback();
  const done = vi.fn();

  await verify(
    "access",
    "refresh",
    {
      emails: [{ value: "user@example.com" }],
      name: { givenName: "Ada", familyName: "Lovelace" },
    },
    done,
  );

  expect(signUpWithProviderMock).toHaveBeenCalledWith({
    email: "user@example.com",
    firstName: "Ada",
    lastName: "Lovelace",
    provider: "google",
  });
  expect(done).toHaveBeenCalledWith(null, { id: 5, email: "user@example.com", needsEnterpriseCode: false });
});

it("verify callback passes needsEnterpriseCode: true for DEFAULT enterprise student", async () => {
  setGoogleEnv();
  userFindFirstMock.mockResolvedValueOnce(null);
  signUpWithProviderMock.mockResolvedValueOnce({ id: 9, email: "student@example.com" });

  const verify = await configureGoogleAndGetVerifyCallback();
  const done = vi.fn();

  await verify(
    "access",
    "refresh",
    { emails: [{ value: "student@example.com" }], name: { givenName: "Jane", familyName: "Doe" } },
    done,
  );

  expect(userFindFirstMock).toHaveBeenCalledWith({
    where: { email: "student@example.com" },
    select: { id: true },
  });
  expect(done).toHaveBeenCalledWith(null, { id: 9, email: "student@example.com", needsEnterpriseCode: true });
});

it("verify callback fails when profile email is missing", async () => {
  setGoogleEnv();
  const verify = await configureGoogleAndGetVerifyCallback();
  const done = vi.fn();

  await verify("access", "refresh", { emails: [], name: {} }, done);

  expect(signUpWithProviderMock).not.toHaveBeenCalled();
  expect(done).toHaveBeenCalledTimes(1);
  expect(done.mock.calls[0][0]).toBeInstanceOf(Error);
  expect(done.mock.calls[0][0].message).toBe("email missing");
});

it("verify callback forwards provider signup errors", async () => {
  setGoogleEnv();
  const signupError = new Error("signup failed");
  signUpWithProviderMock.mockRejectedValueOnce(signupError);

  const verify = await configureGoogleAndGetVerifyCallback();
  const done = vi.fn();

  await verify(
    "access",
    "refresh",
    {
      emails: [{ value: "user@example.com" }],
      name: {},
    },
    done,
  );

  expect(signUpWithProviderMock).toHaveBeenCalledWith({
    email: "user@example.com",
    firstName: "",
    lastName: "",
    provider: "google",
  });
  expect(done).toHaveBeenCalledWith(signupError);
});