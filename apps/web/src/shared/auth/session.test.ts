import { describe, expect, it, vi, beforeEach } from "vitest";

const cookiesMock = vi.fn();
const headersMock = vi.fn();
const apiFetchMock = vi.fn();
const getApiBaseForRequestMock = vi.fn();

async function loadSessionModule() {
  vi.resetModules();
  vi.doMock("next/headers", () => ({
    cookies: cookiesMock,
    headers: headersMock,
  }));
  vi.doMock("@/shared/api/http", () => ({
    apiFetch: apiFetchMock,
  }));
  vi.doMock("@/shared/api/env", () => ({
    API_BASE_URL: "https://api.default.test",
    getApiBaseForRequest: getApiBaseForRequestMock,
  }));

  return import("./session");
}

describe("shared/auth/session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cookiesMock.mockResolvedValue({
      getAll: () => [
        { name: "tf_access_token", value: "cookie-token" },
        { name: "theme", value: "dark" },
      ],
      get: (name: string) => (name === "tf_access_token" ? { value: " cookie-token " } : undefined),
    });
    headersMock.mockResolvedValue({
      get: (name: string) => {
        if (name === "x-forwarded-host") return "workspace.local";
        if (name === "x-forwarded-proto") return "https";
        return null;
      },
    });
    getApiBaseForRequestMock.mockReturnValue("https://api.request.local");
    apiFetchMock.mockResolvedValue({
      id: 7,
      email: "admin@example.com",
      firstName: "Ada",
      lastName: "Admin",
      isStaff: false,
      isAdmin: true,
    });
  });

  it("loads and normalizes current user from API", async () => {
    const session = await loadSessionModule();

    const user = await session.getCurrentUser();

    expect(getApiBaseForRequestMock).toHaveBeenCalledWith("workspace.local", "https");
    expect(apiFetchMock).toHaveBeenCalledWith("/auth/me", {
      baseUrl: "https://api.request.local",
      headers: {
        Authorization: "Bearer cookie-token",
        Cookie: "tf_access_token=cookie-token; theme=dark",
      },
    });

    expect(user).toMatchObject({
      id: 7,
      email: "admin@example.com",
      role: "ADMIN",
      active: true,
      isUnassigned: false,
    });
  });

  it("returns suspended pseudo-user when auth endpoint indicates suspension", async () => {
    apiFetchMock.mockRejectedValueOnce({ status: 403, message: "Account suspended" });
    const session = await loadSessionModule();

    const user = await session.getCurrentUser();

    expect(user).toEqual({
      id: -1,
      email: "",
      firstName: "",
      lastName: "",
      isStaff: false,
      isUnassigned: false,
      role: "STUDENT",
      active: false,
      suspended: true,
    });
  });

  it("returns null when session loading fails for non-suspension errors", async () => {
    apiFetchMock.mockRejectedValueOnce(new Error("network"));
    const session = await loadSessionModule();

    await expect(session.getCurrentUser()).resolves.toBeNull();
  });

  it("evaluates role helper guards", async () => {
    const session = await loadSessionModule();

    expect(session.isAdmin({ role: "ADMIN", isStaff: false } as any)).toBe(true);
    expect(session.isAdmin({ role: "STUDENT", isAdmin: true, isStaff: false } as any)).toBe(true);
    expect(session.isAdmin(null)).toBe(false);

    expect(session.isEnterpriseAdmin({ role: "ENTERPRISE_ADMIN", isStaff: false } as any)).toBe(true);
    expect(session.isEnterpriseAdmin({ role: "STUDENT", isEnterpriseAdmin: true, isStaff: false } as any)).toBe(true);

    expect(session.isModuleScopedStaff({ role: "STUDENT", isStaff: true } as any)).toBe(true);
    expect(session.isModuleScopedStaff({ role: "STAFF", isStaff: true } as any)).toBe(false);

    expect(session.isElevatedStaff({ role: "STAFF", isStaff: true } as any)).toBe(true);
    expect(session.isElevatedStaff({ role: "ENTERPRISE_ADMIN", isStaff: false } as any)).toBe(true);
    expect(session.isElevatedStaff({ role: "ADMIN", isStaff: false } as any)).toBe(true);
    expect(session.isElevatedStaff({ role: "STUDENT", isAdmin: true, isStaff: false } as any)).toBe(true);
    expect(session.isElevatedStaff({ role: "STUDENT", isStaff: false } as any)).toBe(false);
  });
});
