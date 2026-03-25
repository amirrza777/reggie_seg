import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";
import { getCurrentUser, isAdmin, isEnterpriseAdmin } from "@/shared/auth/session";
import EnterpriseLayout from "./layout";

class RedirectSentinel extends Error {
  constructor(readonly path: string) {
    super(path);
  }
}

const sidebarCalls: Array<{ mode: string; links: Array<{ href: string; label: string }> }> = [];

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new RedirectSentinel(path);
  }),
}));

vi.mock("@/shared/auth/session", () => ({
  getCurrentUser: vi.fn(),
  isAdmin: vi.fn(),
  isEnterpriseAdmin: vi.fn(),
}));

vi.mock("@/shared/layout/AppShell", () => ({
  AppShell: ({ sidebar, topbar, ribbon, children }: { sidebar: ReactNode; topbar: ReactNode; ribbon: ReactNode; children: ReactNode }) => (
    <div>
      <div data-testid="shell-sidebar">{sidebar}</div>
      <div data-testid="shell-topbar">{topbar}</div>
      <div data-testid="shell-ribbon">{ribbon}</div>
      {children}
    </div>
  ),
}));

vi.mock("@/shared/layout/Sidebar", () => ({
  Sidebar: ({ mode, links }: { mode: string; links: Array<{ href: string; label: string }> }) => {
    sidebarCalls.push({ mode, links });
    return <div data-testid={`sidebar-${mode}`} />;
  },
}));

vi.mock("@/shared/layout/Topbar", () => ({
  Topbar: ({ titleHref }: { titleHref: string }) => <div data-testid="topbar" data-title-href={titleHref} />,
}));

vi.mock("@/shared/layout/SpaceSwitcher", () => ({
  SpaceSwitcher: ({ links }: { links: Array<{ label: string }> }) => (
    <div data-testid="space-switcher">{links.map((link) => link.label).join(",")}</div>
  ),
}));

vi.mock("@/features/auth/components/UserMenu", () => ({
  UserMenu: () => <div data-testid="user-menu">menu</div>,
}));

const redirectMock = vi.mocked(redirect);
const getCurrentUserMock = vi.mocked(getCurrentUser);
const isAdminMock = vi.mocked(isAdmin);
const isEnterpriseAdminMock = vi.mocked(isEnterpriseAdmin);

describe("EnterpriseLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sidebarCalls.length = 0;
  });

  it("redirects unauthenticated users to login", async () => {
    getCurrentUserMock.mockResolvedValue(null);

    await expect(EnterpriseLayout({ children: <div /> })).rejects.toMatchObject({ path: "/login" });
    expect(redirectMock).toHaveBeenCalledWith("/login");
  });

  it("redirects users without enterprise/staff access to dashboard", async () => {
    getCurrentUserMock.mockResolvedValue({ role: "STUDENT", isStaff: false } as Awaited<ReturnType<typeof getCurrentUser>>);
    isEnterpriseAdminMock.mockReturnValue(false);
    isAdminMock.mockReturnValue(false);

    await expect(EnterpriseLayout({ children: <div /> })).rejects.toMatchObject({ path: "/dashboard" });
    expect(redirectMock).toHaveBeenCalledWith("/dashboard");
  });

  it("renders enterprise-admin navigation and includes workspace + admin spaces when user is admin", async () => {
    getCurrentUserMock.mockResolvedValue({ role: "ADMIN", isStaff: false } as Awaited<ReturnType<typeof getCurrentUser>>);
    isEnterpriseAdminMock.mockReturnValue(false);
    isAdminMock.mockReturnValue(true);

    const page = await EnterpriseLayout({ children: <div data-testid="child">child</div> });
    render(page);

    expect(screen.getByTestId("topbar")).toHaveAttribute("data-title-href", "/enterprise");
    expect(screen.getByTestId("space-switcher")).toHaveTextContent("Workspace,Staff,Enterprise,Admin");
    expect(screen.getByTestId("child")).toBeInTheDocument();

    const desktopSidebar = sidebarCalls.find((entry) => entry.mode === "desktop");
    expect(desktopSidebar?.links).toEqual([
      { href: "/enterprise", label: "Enterprise overview", space: "enterprise" },
      { href: "/enterprise/modules", label: "Module management", space: "enterprise" },
      { href: "/enterprise/feature-flags", label: "Feature flags", space: "enterprise" },
    ]);
  });

  it("renders staff-only enterprise view without workspace/admin spaces", async () => {
    getCurrentUserMock.mockResolvedValue({ role: "STAFF", isStaff: true } as Awaited<ReturnType<typeof getCurrentUser>>);
    isEnterpriseAdminMock.mockReturnValue(false);
    isAdminMock.mockReturnValue(false);

    const page = await EnterpriseLayout({ children: <div /> });
    render(page);

    expect(screen.getByTestId("topbar")).toHaveAttribute("data-title-href", "/enterprise/modules");
    expect(screen.getByTestId("space-switcher")).toHaveTextContent("Staff,Enterprise");
    expect(screen.getByTestId("space-switcher")).not.toHaveTextContent("Workspace");
    expect(screen.getByTestId("space-switcher")).not.toHaveTextContent("Admin");
  });
});
