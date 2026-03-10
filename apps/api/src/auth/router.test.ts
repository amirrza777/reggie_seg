import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./controller.js", () => ({
  signupHandler: vi.fn(),
  loginHandler: vi.fn(),
  refreshHandler: vi.fn(),
  logoutHandler: vi.fn(),
  forgotPasswordHandler: vi.fn(),
  resetPasswordHandler: vi.fn(),
  meHandler: vi.fn(),
  updateProfileHandler: vi.fn(),
  requestEmailChangeHandler: vi.fn(),
  confirmEmailChangeHandler: vi.fn(),
}));

vi.mock("./middleware.js", () => ({ requireAuth: vi.fn((_req: any, _res: any, next: any) => next()) }));
vi.mock("passport", () => ({
  default: {
    authenticate: vi.fn(() => (_req: any, _res: any, next: any) => (next ? next() : undefined)),
  },
}));
vi.mock("./service.js", () => ({ issueTokensForUser: vi.fn().mockResolvedValue({ accessToken: "a", refreshToken: "r" }) }));

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
        { path: "/login", methods: { post: true } },
        { path: "/refresh", methods: { post: true } },
        { path: "/logout", methods: { post: true } },
        { path: "/me", methods: { get: true } },
      ])
    );

    const googleLayer = router.stack.find((layer: any) => layer.route?.path === "/google");
    const res: any = { status: vi.fn(), json: vi.fn() };
    res.status.mockReturnValue(res);

    googleLayer.route.stack[0].handle({} as any, res);
    expect(res.status).toHaveBeenCalledWith(503);
  });

  it("google callback issues tokens, sets cookie and redirects when oauth is enabled", async () => {
    vi.resetModules();
    vi.doMock("./google.js", () => ({ configureGoogle: () => true }));
    const { issueTokensForUser } = await import("./service.js");
    const { default: router } = await import("./router.js");

    const callbackLayer = router.stack.find((layer: any) => layer.route?.path === "/google/callback");
    const callbackHandler = callbackLayer.route.stack.at(-1).handle;
    const res: any = { cookie: vi.fn(), redirect: vi.fn() };

    await callbackHandler({ user: { id: 5, email: "u@test.com" } } as any, res);

    expect(issueTokensForUser).toHaveBeenCalledWith(5, "u@test.com");
    expect(res.cookie).toHaveBeenCalledWith(
      "refresh_token",
      "r",
      expect.objectContaining({ httpOnly: true, path: "/" })
    );
    expect(res.redirect).toHaveBeenCalledWith("http://localhost:3001/modules");
  });
});
