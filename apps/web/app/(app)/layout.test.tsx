import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";
import AppLayout from "./layout";
import { listModules } from "@/features/modules/api/client";
import { getUserProjects } from "@/features/projects/api/client";
import { getCurrentUser, isAdmin, isEnterpriseAdmin, isModuleScopedStaff } from "@/shared/auth/session";
import { getDefaultSpaceOverviewPath } from "@/shared/auth/default-space";
import { getFeatureFlagMap } from "@/shared/featureFlags";
import { logDevError } from "@/shared/lib/devLogger";

class RedirectSentinel extends Error {
  constructor(readonly path: string) {
    super(path);
  }
}

const sidebarCalls: Array<{ mode: string; links: Array<{ href: string; label: string }> }> = [];
const prefetchCalls: string[][] = [];

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new RedirectSentinel(path);
  }),
}));

vi.mock("@/shared/layout/AppShell", () => ({
  AppShell: ({ sidebar, topbar, ribbon, children }: { sidebar: ReactNode; topbar: ReactNode; ribbon: ReactNode; children: ReactNode }) => (
    <div data-testid="app-shell">
      <div data-testid="shell-sidebar">{sidebar}</div>
      <div data-testid="shell-topbar">{topbar}</div>
      <div data-testid="shell-ribbon">{ribbon}</div>
      <div data-testid="shell-body">{children}</div>
    </div>
  ),
}));

vi.mock("@/shared/layout/Sidebar", () => ({
  Sidebar: ({ title, mode, links }: { title: string; mode: string; links: Array<{ href: string; label: string }> }) => {
    sidebarCalls.push({ mode, links });
    return <div data-testid={`sidebar-${mode}`}>{title}</div>;
  },
}));

vi.mock("@/shared/layout/Topbar", () => ({
  Topbar: ({ title, leading, actions }: { title: string; leading: ReactNode; actions: ReactNode }) => (
    <div data-testid="topbar">
      <span>{title}</span>
      <div data-testid="topbar-leading">{leading}</div>
      <div data-testid="topbar-actions">{actions}</div>
    </div>
  ),
}));

vi.mock("@/shared/layout/SpaceSwitcher", () => ({
  SpaceSwitcher: ({ links }: { links: Array<{ label: string }> }) => (
    <div data-testid="space-switcher">{links.map((link) => link.label).join(",")}</div>
  ),
}));

vi.mock("@/shared/layout/NavigationPrefetch", () => ({
  NavigationPrefetch: ({ hrefs }: { hrefs: string[] }) => {
    prefetchCalls.push(hrefs);
    return <div data-testid="navigation-prefetch">{hrefs.join("|")}</div>;
  },
}));

vi.mock("@/features/auth/components/UserMenu", () => ({
  UserMenu: () => <div data-testid="user-menu">menu</div>,
}));

vi.mock("@/features/modules/api/client", () => ({
  listModules: vi.fn(),
}));

vi.mock("@/features/projects/api/client", () => ({
  getUserProjects: vi.fn(),
}));

vi.mock("@/shared/auth/session", () => ({
  getCurrentUser: vi.fn(),
  isAdmin: vi.fn(),
  isEnterpriseAdmin: vi.fn(),
  isModuleScopedStaff: vi.fn(),
}));

vi.mock("@/shared/auth/default-space", () => ({
  getDefaultSpaceOverviewPath: vi.fn(),
}));

vi.mock("@/shared/featureFlags", () => ({
  getFeatureFlagMap: vi.fn(),
}));

vi.mock("@/shared/lib/devLogger", () => ({
  logDevError: vi.fn(),
}));

const redirectMock = vi.mocked(redirect);
const listModulesMock = vi.mocked(listModules);
const getUserProjectsMock = vi.mocked(getUserProjects);
const getCurrentUserMock = vi.mocked(getCurrentUser);
const isAdminMock = vi.mocked(isAdmin);
const isEnterpriseAdminMock = vi.mocked(isEnterpriseAdmin);
const isModuleScopedStaffMock = vi.mocked(isModuleScopedStaff);
const getDefaultSpaceOverviewPathMock = vi.mocked(getDefaultSpaceOverviewPath);
const getFeatureFlagMapMock = vi.mocked(getFeatureFlagMap);
const logDevErrorMock = vi.mocked(logDevError);

describe("AppLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sidebarCalls.length = 0;
    prefetchCalls.length = 0;

    getCurrentUserMock.mockResolvedValue({
      id: 101,
      isStaff: false,
      suspended: false,
      active: true,
      email: "student@example.com",
    } as Awaited<ReturnType<typeof getCurrentUser>>);
    isAdminMock.mockReturnValue(false);
    isEnterpriseAdminMock.mockReturnValue(false);
    isModuleScopedStaffMock.mockReturnValue(false);
    getFeatureFlagMapMock.mockResolvedValue({});
    getDefaultSpaceOverviewPathMock.mockReturnValue("/dashboard");
    listModulesMock.mockResolvedValue([
      { id: 7, title: "SE Foundations" },
      { id: 8, title: "Distributed Systems" },
    ] as Awaited<ReturnType<typeof listModules>>);
    getUserProjectsMock.mockResolvedValue([{ id: 21, name: "Project Atlas" }] as Awaited<ReturnType<typeof getUserProjects>>);
  });

  it("redirects unauthenticated users to /login", async () => {
    getCurrentUserMock.mockResolvedValue(null);

    await expect(AppLayout({ children: <div /> })).rejects.toMatchObject({ path: "/login" });
    expect(redirectMock).toHaveBeenCalledWith("/login");
  });

  it("renders the suspended account view and skips navigation loading", async () => {
    getCurrentUserMock.mockResolvedValue({
      id: 101,
      isStaff: false,
      suspended: true,
      active: true,
      email: "student@example.com",
    } as Awaited<ReturnType<typeof getCurrentUser>>);

    const page = await AppLayout({ children: <div data-testid="child">child</div> });
    render(page);

    expect(screen.getByText("Account suspended")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Return to login" })).toHaveAttribute("href", "/login");
    expect(listModulesMock).not.toHaveBeenCalled();
    expect(getUserProjectsMock).not.toHaveBeenCalled();
  });

  it("builds workspace navigation, shell chrome, and prefetch targets for active users", async () => {
    const page = await AppLayout({ children: <div data-testid="child">child</div> });
    render(page);

    expect(screen.getByTestId("app-shell")).toBeInTheDocument();
    expect(screen.getByTestId("topbar")).toHaveTextContent("Team Feedback");
    expect(screen.getByTestId("space-switcher")).toHaveTextContent("Workspace");
    expect(screen.getByTestId("child")).toBeInTheDocument();

    const desktopSidebar = sidebarCalls.find((call) => call.mode === "desktop");
    expect(desktopSidebar?.links.map((link) => link.href)).toEqual(["/dashboard", "/projects", "/calendar"]);

    expect(prefetchCalls).toHaveLength(1);
    expect(prefetchCalls[0]).toEqual(["/dashboard", "/projects", "/calendar"]);
  });

  it("limits staff-only users to staff navigation and staff space", async () => {
    getCurrentUserMock.mockResolvedValue({
      id: 400,
      isStaff: true,
      suspended: false,
      active: true,
      email: "staff@example.com",
    } as Awaited<ReturnType<typeof getCurrentUser>>);

    const page = await AppLayout({ children: <div /> });
    render(page);

    expect(screen.getByTestId("space-switcher")).toHaveTextContent("Staff");
    expect(screen.getByTestId("space-switcher")).not.toHaveTextContent("Workspace");

    const desktopSidebar = sidebarCalls.find((call) => call.mode === "desktop");
    expect(desktopSidebar?.links.map((link) => link.href)).toEqual([
      "/staff/dashboard",
      "/staff/modules",
      "/staff/marks",
      "/staff/questionnaires",
      "/staff/archive",
    ]);
  });

  it("logs rejected child loaders and still renders admin + enterprise spaces", async () => {
    getCurrentUserMock.mockResolvedValue({
      id: 999,
      isStaff: true,
      suspended: false,
      active: true,
      email: "admin@kcl.ac.uk",
    } as Awaited<ReturnType<typeof getCurrentUser>>);
    isAdminMock.mockReturnValue(true);
    isEnterpriseAdminMock.mockReturnValue(true);
    listModulesMock.mockRejectedValue(new Error("modules unavailable"));
    getUserProjectsMock.mockRejectedValue(new Error("projects unavailable"));

    const page = await AppLayout({ children: <div /> });
    render(page);

    expect(screen.getByTestId("space-switcher")).toHaveTextContent("Workspace,Staff,Enterprise,Admin");
    expect(logDevErrorMock).toHaveBeenCalledTimes(2);
    expect(logDevErrorMock).toHaveBeenNthCalledWith(1, "Failed to load module navigation children", expect.any(Error));
    expect(logDevErrorMock).toHaveBeenNthCalledWith(2, "Failed to load project navigation children", expect.any(Error));

    const desktopSidebar = sidebarCalls.find((call) => call.mode === "desktop");
    expect(desktopSidebar?.links.map((link) => link.href)).toContain("/admin");
  });
});
