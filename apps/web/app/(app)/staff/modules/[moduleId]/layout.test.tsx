import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";
import {
  loadStaffModuleWorkspaceContext,
  resolveStaffModuleWorkspaceAccess,
} from "@/features/modules/staffModuleWorkspaceLayoutData";
import { getCurrentUser } from "@/shared/auth/session";
import StaffModuleWorkspaceLayout from "./layout";

class RedirectSentinel extends Error {
  constructor(readonly path: string) {
    super(path);
  }
}

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new RedirectSentinel(path);
  }),
}));

vi.mock("@/features/modules/staffModuleWorkspaceLayoutData", () => ({
  loadStaffModuleWorkspaceContext: vi.fn(),
  resolveStaffModuleWorkspaceAccess: vi.fn(),
}));

vi.mock("@/shared/auth/session", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/features/modules/components/workspace/StaffModuleWorkspaceBreadcrumbs", () => ({
  StaffModuleWorkspaceBreadcrumbs: ({ moduleId, moduleTitle }: { moduleId: string; moduleTitle: string }) => (
    <div data-testid="breadcrumbs">{`${moduleTitle}#${moduleId}`}</div>
  ),
}));

vi.mock("@/features/modules/components/ModuleWorkspaceNav", () => ({
  ModuleWorkspaceNav: ({ moduleId, basePath }: { moduleId: string; basePath: string }) => (
    <div data-testid="workspace-nav">{`${basePath}/${moduleId}`}</div>
  ),
}));

vi.mock("@/features/modules/components/workspace/StaffModuleWorkspaceHero", () => ({
  StaffModuleWorkspaceHero: ({ isArchived }: { isArchived: boolean }) => (
    <div data-testid="workspace-hero">{isArchived ? "archived" : "active"}</div>
  ),
}));

vi.mock("@/features/modules/components/workspace/StaffModuleWorkspaceArchivedBanner", () => ({
  StaffModuleWorkspaceArchivedBanner: () => <div data-testid="archived-banner">Archived banner</div>,
}));

const redirectMock = vi.mocked(redirect);
const loadStaffModuleWorkspaceContextMock = vi.mocked(loadStaffModuleWorkspaceContext);
const resolveStaffModuleWorkspaceAccessMock = vi.mocked(resolveStaffModuleWorkspaceAccess);
const getCurrentUserMock = vi.mocked(getCurrentUser);

function makeWorkspaceContext() {
  return {
    user: { id: 9 },
    moduleId: "22",
    parsedModuleId: 22,
    moduleRecord: null,
    module: { id: "22", title: "Systems Project" },
    isElevated: false,
    isEnterpriseAdmin: false,
  } as Awaited<ReturnType<typeof loadStaffModuleWorkspaceContext>>;
}

function makeAccess(overrides: Partial<ReturnType<typeof resolveStaffModuleWorkspaceAccess>> = {}) {
  return {
    listSlot: "owner",
    orgOrPlatformAdmin: false,
    staffModuleSetup: false,
    enterpriseModuleEditor: false,
    createProjectInModule: false,
    isArchived: false,
    canEdit: false,
    canCreateProject: false,
    ...overrides,
  } as ReturnType<typeof resolveStaffModuleWorkspaceAccess>;
}

describe("StaffModuleWorkspaceLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadStaffModuleWorkspaceContextMock.mockResolvedValue(makeWorkspaceContext());
    resolveStaffModuleWorkspaceAccessMock.mockReturnValue(makeAccess());
    getCurrentUserMock.mockResolvedValue({ id: 9 } as Awaited<ReturnType<typeof getCurrentUser>>);
  });

  it("redirects to login when workspace context is missing and there is no current user", async () => {
    loadStaffModuleWorkspaceContextMock.mockResolvedValueOnce(null);
    getCurrentUserMock.mockResolvedValueOnce(null);

    await expect(
      StaffModuleWorkspaceLayout({
        params: Promise.resolve({ moduleId: "22" }),
        children: <div />,
      }),
    ).rejects.toBeInstanceOf(RedirectSentinel);

    expect(redirectMock).toHaveBeenCalledWith("/login");
  });

  it("redirects to staff modules when workspace context is missing but user exists", async () => {
    loadStaffModuleWorkspaceContextMock.mockResolvedValueOnce(null);
    getCurrentUserMock.mockResolvedValueOnce({ id: 9 } as Awaited<ReturnType<typeof getCurrentUser>>);

    await expect(
      StaffModuleWorkspaceLayout({
        params: Promise.resolve({ moduleId: "22" }),
        children: <div />,
      }),
    ).rejects.toBeInstanceOf(RedirectSentinel);

    expect(redirectMock).toHaveBeenCalledWith("/staff/modules");
  });

  it("renders module workspace shell without archive banner when module is active", async () => {
    resolveStaffModuleWorkspaceAccessMock.mockReturnValueOnce(makeAccess({ isArchived: false }));

    const page = await StaffModuleWorkspaceLayout({
      params: Promise.resolve({ moduleId: "22" }),
      children: <div data-testid="child">Child content</div>,
    });
    render(page);

    expect(loadStaffModuleWorkspaceContextMock).toHaveBeenCalledWith("22");
    expect(screen.getByTestId("breadcrumbs")).toHaveTextContent("Systems Project#22");
    expect(screen.getByTestId("workspace-nav")).toHaveTextContent("/staff/modules/22");
    expect(screen.getByTestId("workspace-hero")).toHaveTextContent("active");
    expect(screen.getByTestId("child")).toHaveTextContent("Child content");
    expect(screen.queryByTestId("archived-banner")).not.toBeInTheDocument();
  });

  it("renders archive banner when module access reports archived", async () => {
    resolveStaffModuleWorkspaceAccessMock.mockReturnValueOnce(makeAccess({ isArchived: true }));

    const page = await StaffModuleWorkspaceLayout({
      params: Promise.resolve({ moduleId: "22" }),
      children: <div data-testid="child">Child content</div>,
    });
    render(page);

    expect(screen.getByTestId("workspace-hero")).toHaveTextContent("archived");
    expect(screen.getByTestId("archived-banner")).toHaveTextContent("Archived banner");
  });
});
