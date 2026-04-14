import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./controller.js", () => ({
  signupHandler: vi.fn(),
  getEnterpriseAdminInviteStateHandler: vi.fn(),
  acceptEnterpriseAdminInviteHandler: vi.fn(),
  getGlobalAdminInviteStateHandler: vi.fn(),
  acceptGlobalAdminInviteHandler: vi.fn(),
  loginHandler: vi.fn(),
  refreshHandler: vi.fn(),
  logoutHandler: vi.fn(),
  forgotPasswordHandler: vi.fn(),
  resetPasswordHandler: vi.fn(),
  meHandler: vi.fn(),
  updateProfileHandler: vi.fn(),
  requestEmailChangeHandler: vi.fn(),
  confirmEmailChangeHandler: vi.fn(),
  deleteAccountHandler: vi.fn(),
  joinEnterpriseByCodeHandler: vi.fn(),
  leaveEnterpriseHandler: vi.fn(),
}));

vi.mock("./middleware.js", () => ({
  requireAuth: vi.fn((_req: any, _res: any, next: any) => next()),
  optionalAuth: vi.fn((_req: any, _res: any, next: any) => next()),
}));
vi.mock("passport", () => ({
  default: {
    authenticate: vi.fn(() => (_req: any, _res: any, next: any) => (next ? next() : undefined)),
  },
}));
vi.mock("./service.js", () => ({ issueTokensForUser: vi.fn().mockResolvedValue({ accessToken: "a", refreshToken: "r" }) }));

const APP_HOME_REDIRECT = "http://localhost:3001/google/success?token=a&redirect=%2Fapp-home";

async function loadGoogleCallbackHandler() {
  vi.resetModules();
  vi.doMock("./google.js", () => ({ configureGoogle: () => true }));
  const { default: router } = await import("./router.js");
  const callbackLayer = router.stack.find((layer: any) => layer.route?.path === "/google/callback");
  return callbackLayer.route.stack.at(-1).handle as (req: any, res: any) => Promise<void>;
}

function createGoogleCallbackResponseMock() {
  return { cookie: vi.fn(), redirect: vi.fn() };
}

async function invokeGoogleCallback(
  user: { id: number; email: string; role?: "ADMIN" | "STAFF" | "ENTERPRISE_ADMIN"; needsEnterpriseCode?: boolean },
) {
  const callbackHandler = await loadGoogleCallbackHandler();
  const res = createGoogleCallbackResponseMock();
  await callbackHandler({ user } as any, res as any);
  return res;
}

describe("auth router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("registers base auth routes and 503 google routes when oauth is disabled", async () => {
    vi.resetModules();
    vi.doMock("./google.js", () => ({ configureGoogle: () => false }));
    const { default: router } = await import("./router.js");

    const routes = router.stack
      .filter((layer: any) => layer.route)
      .map((layer: any) => ({ path: layer.route.path, methods: layer.route.methods }));

    expect(routes).toEqual(
      expect.arrayContaining([
        { path: "/signup", methods: { post: true } },
        { path: "/enterprise-admin/state", methods: { post: true } },
        { path: "/enterprise-admin/accept", methods: { post: true } },
        { path: "/global-admin/state", methods: { post: true } },
        { path: "/global-admin/accept", methods: { post: true } },
        { path: "/login", methods: { post: true } },
        { path: "/refresh", methods: { post: true } },
        { path: "/logout", methods: { post: true } },
        { path: "/me", methods: { get: true } },
        { path: "/account/delete", methods: { post: true } },
        { path: "/enterprise/join", methods: { post: true } },
        { path: "/enterprise/leave", methods: { post: true } },
      ])
    );

    const googleLayer = router.stack.find((layer: any) => layer.route?.path === "/google");
    const res: any = { status: vi.fn(), json: vi.fn() };
    res.status.mockReturnValue(res);

    googleLayer.route.stack[0].handle({} as any, res);
    expect(res.status).toHaveBeenCalledWith(503);
  });

  it("google callback issues tokens, sets cookie and redirects to app-home resolver", async () => {
    const { issueTokensForUser } = await import("./service.js");
    const res = await invokeGoogleCallback({ id: 5, email: "u@test.com" });

    expect(issueTokensForUser).toHaveBeenCalledWith(5, "u@test.com");
    expect(res.cookie).toHaveBeenCalledWith(
      "refresh_token",
      "r",
      expect.objectContaining({ httpOnly: true, path: "/" })
    );
    expect(res.redirect).toHaveBeenCalledWith(APP_HOME_REDIRECT);
  });

  it("google callback returns 401 when passport callback does not attach a user", async () => {
    const callbackHandler = await loadGoogleCallbackHandler();
    const res: any = { status: vi.fn(), json: vi.fn() };
    res.status.mockReturnValue(res);
    res.json.mockReturnValue(res);

    await callbackHandler({} as any, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Google login failed" });
  });

  it.each([
    { label: "admins", role: "ADMIN", email: "admin@test.com" },
    { label: "staff users", role: "STAFF", email: "staff@test.com" },
    { label: "enterprise admins", role: "ENTERPRISE_ADMIN", email: "ea@test.com" },
  ])("google callback sends $label through app-home resolver", async ({ role, email }) => {
    const res = await invokeGoogleCallback({ id: 5, email, role });

    expect(res.redirect).toHaveBeenCalledWith(APP_HOME_REDIRECT);
  });

  it("google callback redirects to enterprise-code page when needsEnterpriseCode is true", async () => {
    const res = await invokeGoogleCallback({ id: 9, email: "student@test.com", needsEnterpriseCode: true });

    expect(res.redirect).toHaveBeenCalledWith(
      "http://localhost:3001/google/success?token=a&redirect=%2Fgoogle%2Fenterprise-code",
    );
  });

  it("google callback uses secure cookie settings in production", async () => {
    const previousNodeEnv = process.env.NODE_ENV;
    const previousAppBaseUrl = process.env.APP_BASE_URL;
    const previousCookieDomain = process.env.COOKIE_DOMAIN;
    const previousCookieSecure = process.env.COOKIE_SECURE;
    const previousRateLimitAllowInMemory = process.env.RATE_LIMIT_ALLOW_IN_MEMORY;
    process.env.NODE_ENV = "production";
    process.env.APP_BASE_URL = "https://app.example.com/";
    process.env.COOKIE_DOMAIN = "example.com";
    process.env.RATE_LIMIT_ALLOW_IN_MEMORY = "true";
    delete process.env.COOKIE_SECURE;

    try {
      const res = await invokeGoogleCallback({ id: 5, email: "u@test.com" });

      expect(res.cookie).toHaveBeenCalledWith(
        "refresh_token",
        "r",
        expect.objectContaining({
          secure: true,
          sameSite: "none",
          domain: "example.com",
        }),
      );
      expect(res.redirect).toHaveBeenCalledWith(
        "https://app.example.com/google/success?token=a&redirect=%2Fapp-home",
      );
    } finally {
      process.env.NODE_ENV = previousNodeEnv;
      if (previousAppBaseUrl === undefined) delete process.env.APP_BASE_URL;
      else process.env.APP_BASE_URL = previousAppBaseUrl;
      if (previousCookieDomain === undefined) delete process.env.COOKIE_DOMAIN;
      else process.env.COOKIE_DOMAIN = previousCookieDomain;
      if (previousCookieSecure === undefined) delete process.env.COOKIE_SECURE;
      else process.env.COOKIE_SECURE = previousCookieSecure;
      if (previousRateLimitAllowInMemory === undefined) delete process.env.RATE_LIMIT_ALLOW_IN_MEMORY;
      else process.env.RATE_LIMIT_ALLOW_IN_MEMORY = previousRateLimitAllowInMemory;
    }
  });
});