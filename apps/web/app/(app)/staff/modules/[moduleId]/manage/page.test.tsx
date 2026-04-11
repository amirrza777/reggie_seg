import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/shared/auth/session";
import {
  loadStaffModuleWorkspaceContext,
  resolveStaffModuleWorkspaceAccess,
} from "@/features/modules/staffModuleWorkspaceLayoutData";
import StaffModuleManagePage from "./page";

class RedirectSentinel extends Error {}
class NotFoundSentinel extends Error {}

vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new RedirectSentinel();
  }),
  notFound: vi.fn(() => {
    throw new NotFoundSentinel();
  }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/shared/auth/session", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/features/modules/staffModuleWorkspaceLayoutData", () => ({
  loadStaffModuleWorkspaceContext: vi.fn(),
  resolveStaffModuleWorkspaceAccess: vi.fn(),
}));

vi.mock("@/shared/ui/Card", () => ({
  Card: ({ title, action, children }: { title: ReactNode; action: ReactNode; children: ReactNode }) => (
    <section data-testid="card">
      <div data-testid="card-title">{title}</div>
      <div data-testid="card-action">{action}</div>
      {children}
    </section>
  ),
}));

vi.mock("@/features/enterprise/components/EnterpriseModuleCreateForm", () => ({
  EnterpriseModuleCreateForm: ({
    mode,
    moduleId,
    workspace,
    joinCode,
    created,
    successRedirectAfterUpdateHref,
  }: {
    mode: string;
    moduleId: number;
    workspace: string;
    joinCode?: string | null;
    created?: boolean;
    successRedirectAfterUpdateHref?: string;
  }) => (
    <div
      data-testid="module-form"
      data-mode={mode}
      data-module-id={String(moduleId)}
      data-workspace={workspace}
      data-join-code={joinCode ?? ""}
      data-created={created ? "true" : "false"}
      data-success-redirect={successRedirectAfterUpdateHref ?? ""}
    />
  ),
}));

const redirectMock = vi.mocked(redirect);
const notFoundMock = vi.mocked(notFound);
const getCurrentUserMock = vi.mocked(getCurrentUser);
const loadStaffModuleWorkspaceContextMock = vi.mocked(loadStaffModuleWorkspaceContext);
const resolveStaffModuleWorkspaceAccessMock = vi.mocked(resolveStaffModuleWorkspaceAccess);

const staffUser = { id: 7, isStaff: true, role: "STAFF" };

const baseContext = {
  user: staffUser,
  moduleId: "11",
  parsedModuleId: 11,
  moduleRecord: { id: "11", title: "CS11", accountRole: "OWNER" },
  module: { id: "11", title: "CS11", accountRole: "OWNER" },
  isElevated: false,
  isEnterpriseAdmin: false,
} as Awaited<ReturnType<typeof loadStaffModuleWorkspaceContext>>;

describe("StaffModuleManagePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUserMock.mockResolvedValue(staffUser as Awaited<ReturnType<typeof getCurrentUser>>);
    loadStaffModuleWorkspaceContextMock.mockResolvedValue(baseContext);
    resolveStaffModuleWorkspaceAccessMock.mockReturnValue(
      { enterpriseModuleEditor: false, isArchived: false } as ReturnType<typeof resolveStaffModuleWorkspaceAccess>,
    );
  });

  it("redirects unauthenticated users to login", async () => {
    getCurrentUserMock.mockResolvedValueOnce(null);

    await expect(
      StaffModuleManagePage({
        params: Promise.resolve({ moduleId: "11" }),
      }),
    ).rejects.toBeInstanceOf(RedirectSentinel);

    expect(redirectMock).toHaveBeenCalledWith("/login");
  });

  it("redirects unauthorized users to dashboard", async () => {
    getCurrentUserMock.mockResolvedValueOnce({ id: 7, isStaff: false, role: "STUDENT" } as Awaited<ReturnType<typeof getCurrentUser>>);

    await expect(
      StaffModuleManagePage({
        params: Promise.resolve({ moduleId: "11" }),
      }),
    ).rejects.toBeInstanceOf(RedirectSentinel);

    expect(redirectMock).toHaveBeenCalledWith("/dashboard");
  });

  it("calls notFound for invalid module ids", async () => {
    await expect(
      StaffModuleManagePage({
        params: Promise.resolve({ moduleId: "abc" }),
      }),
    ).rejects.toBeInstanceOf(NotFoundSentinel);

    expect(notFoundMock).toHaveBeenCalledTimes(1);
  });

  it("redirects to module list when workspace context cannot be loaded", async () => {
    loadStaffModuleWorkspaceContextMock.mockResolvedValueOnce(null);

    await expect(
      StaffModuleManagePage({
        params: Promise.resolve({ moduleId: "11" }),
      }),
    ).rejects.toBeInstanceOf(RedirectSentinel);

    expect(loadStaffModuleWorkspaceContextMock).toHaveBeenCalledWith("11");
    expect(redirectMock).toHaveBeenCalledWith("/staff/modules");
  });

  it("redirects when requested module is missing or not owner-managed", async () => {
    loadStaffModuleWorkspaceContextMock.mockResolvedValueOnce({
      ...baseContext,
      moduleRecord: null,
    });

    await expect(
      StaffModuleManagePage({
        params: Promise.resolve({ moduleId: "11" }),
      }),
    ).rejects.toBeInstanceOf(RedirectSentinel);

    expect(redirectMock).toHaveBeenLastCalledWith("/staff/modules");

    loadStaffModuleWorkspaceContextMock.mockResolvedValueOnce({
      ...baseContext,
      moduleRecord: { id: "11", title: "CS11", accountRole: "TEACHING_ASSISTANT" },
    });

    await expect(
      StaffModuleManagePage({
        params: Promise.resolve({ moduleId: "11" }),
      }),
    ).rejects.toBeInstanceOf(RedirectSentinel);

    expect(redirectMock).toHaveBeenLastCalledWith("/modules/11");

    loadStaffModuleWorkspaceContextMock.mockResolvedValueOnce({
      ...baseContext,
      moduleRecord: { id: "11", title: "CS11", accountRole: "TEACHING_ASSISTANT" },
    });
    resolveStaffModuleWorkspaceAccessMock.mockReturnValueOnce(
      { enterpriseModuleEditor: true, isArchived: false } as ReturnType<typeof resolveStaffModuleWorkspaceAccess>,
    );

    await expect(
      StaffModuleManagePage({
        params: Promise.resolve({ moduleId: "11" }),
      }),
    ).rejects.toBeInstanceOf(RedirectSentinel);

    expect(redirectMock).toHaveBeenLastCalledWith("/enterprise/modules/11/edit");
  });

  it("redirects enterprise editors to enterprise module edit page", async () => {
    loadStaffModuleWorkspaceContextMock.mockResolvedValueOnce({
      ...baseContext,
      moduleRecord: { id: "11", title: "CS11", accountRole: "TEACHING_ASSISTANT" },
    });
    resolveStaffModuleWorkspaceAccessMock.mockReturnValueOnce(
      { enterpriseModuleEditor: true, isArchived: false } as ReturnType<typeof resolveStaffModuleWorkspaceAccess>,
    );

    await expect(
      StaffModuleManagePage({
        params: Promise.resolve({ moduleId: "11" }),
      }),
    ).rejects.toBeInstanceOf(RedirectSentinel);

    expect(redirectMock).toHaveBeenLastCalledWith("/enterprise/modules/11/edit");
  });

  it("renders manage page and passes created join code to module form", async () => {
    const page = await StaffModuleManagePage({
      params: Promise.resolve({ moduleId: "11" }),
      searchParams: Promise.resolve({ created: "1", joinCode: "JOIN123" }),
    });

    render(page);

    expect(screen.getByRole("heading", { level: 1, name: "Manage module" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create project" })).toHaveAttribute(
      "href",
      "/staff/projects/create?moduleId=11",
    );

    const form = screen.getByTestId("module-form");
    expect(form).toHaveAttribute("data-mode", "edit");
    expect(form).toHaveAttribute("data-module-id", "11");
    expect(form).toHaveAttribute("data-workspace", "staff");
    expect(form).toHaveAttribute("data-join-code", "JOIN123");
    expect(form).toHaveAttribute("data-created", "true");
    expect(form).toHaveAttribute("data-success-redirect", "/staff/modules/11");
  });

  it("renders archived helper text and omits create action when module is archived", async () => {
    resolveStaffModuleWorkspaceAccessMock.mockReturnValueOnce(
      { enterpriseModuleEditor: false, isArchived: true } as ReturnType<typeof resolveStaffModuleWorkspaceAccess>,
    );

    const page = await StaffModuleManagePage({
      params: Promise.resolve({ moduleId: "11" }),
      searchParams: Promise.resolve({ created: "0" }),
    });

    render(page);

    expect(
      screen.getByText(
        'This module is archived and read-only. To make changes, unarchive using the "Archive or delete module" section at the bottom of this page.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Create project" })).not.toBeInTheDocument();
    expect(screen.getByTestId("module-form")).toHaveAttribute("data-join-code", "");
    expect(screen.getByTestId("module-form")).toHaveAttribute("data-created", "false");
  });
});
