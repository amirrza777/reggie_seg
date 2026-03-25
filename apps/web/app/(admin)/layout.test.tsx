import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";
import { getCurrentUser, isAdmin } from "@/shared/auth/session";
import AdminLayout from "./layout";

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
  Sidebar: ({ title, mode, links }: { title: string; mode: string; links: Array<{ href: string; label: string }> }) => {
    sidebarCalls.push({ mode, links });
    return <div data-testid={`sidebar-${mode}`}>{title}</div>;
  },
}));

vi.mock("@/shared/layout/Topbar", () => ({
  Topbar: ({ title }: { title: string }) => <div data-testid="topbar">{title}</div>,
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

describe("AdminLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sidebarCalls.length = 0;
  });

  it("redirects unauthenticated users to login", async () => {
    getCurrentUserMock.mockResolvedValue(null);

    await expect(AdminLayout({ children: <div /> })).rejects.toMatchObject({ path: "/login" });
    expect(redirectMock).toHaveBeenCalledWith("/login");
  });

  it("redirects non-admin users to dashboard", async () => {
    getCurrentUserMock.mockResolvedValue({ email: "staff@example.com" } as Awaited<ReturnType<typeof getCurrentUser>>);
    isAdminMock.mockReturnValue(false);

    await expect(AdminLayout({ children: <div /> })).rejects.toMatchObject({ path: "/dashboard" });
    expect(redirectMock).toHaveBeenCalledWith("/dashboard");
  });

  it("renders admin shell with super-admin enterprise navigation", async () => {
    getCurrentUserMock.mockResolvedValue({ email: "admin@kcl.ac.uk" } as Awaited<ReturnType<typeof getCurrentUser>>);
    isAdminMock.mockReturnValue(true);

    const page = await AdminLayout({ children: <div data-testid="child">child</div> });
    render(page);

    expect(screen.getByTestId("topbar")).toHaveTextContent("Team Feedback");
    expect(screen.getByTestId("space-switcher")).toHaveTextContent("Workspace,Staff,Enterprise,Admin");
    expect(screen.getByTestId("child")).toBeInTheDocument();

    const desktopSidebar = sidebarCalls.find((entry) => entry.mode === "desktop");
    expect(desktopSidebar?.links).toEqual([
      { href: "/admin", label: "Admin dashboard", space: "admin" },
      { href: "/admin/enterprises", label: "Enterprises", space: "admin" },
    ]);
  });
});
