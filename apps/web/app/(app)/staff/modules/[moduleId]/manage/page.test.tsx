import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { notFound, redirect } from "next/navigation";
import { listModules } from "@/features/modules/api/client";
import { getCurrentUser } from "@/shared/auth/session";
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

vi.mock("@/features/modules/api/client", () => ({
  listModules: vi.fn(),
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
    createdJoinCode,
  }: {
    mode: string;
    moduleId: number;
    workspace: string;
    createdJoinCode: string | null;
  }) => (
    <div
      data-testid="module-form"
      data-mode={mode}
      data-module-id={String(moduleId)}
      data-workspace={workspace}
      data-created-join-code={createdJoinCode ?? ""}
    />
  ),
}));

const redirectMock = vi.mocked(redirect);
const notFoundMock = vi.mocked(notFound);
const getCurrentUserMock = vi.mocked(getCurrentUser);
const listModulesMock = vi.mocked(listModules);

const staffUser = { id: 7, isStaff: true, role: "STAFF" };

describe("StaffModuleManagePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    getCurrentUserMock.mockResolvedValueOnce({ id: 7, isStaff: false, role: "STUDENT" });

    await expect(
      StaffModuleManagePage({
        params: Promise.resolve({ moduleId: "11" }),
      }),
    ).rejects.toBeInstanceOf(RedirectSentinel);

    expect(redirectMock).toHaveBeenCalledWith("/dashboard");
  });

  it("calls notFound for invalid module ids", async () => {
    getCurrentUserMock.mockResolvedValueOnce(staffUser);

    await expect(
      StaffModuleManagePage({
        params: Promise.resolve({ moduleId: "abc" }),
      }),
    ).rejects.toBeInstanceOf(NotFoundSentinel);

    expect(notFoundMock).toHaveBeenCalledTimes(1);
  });

  it("redirects to module list when loading staff modules fails", async () => {
    getCurrentUserMock.mockResolvedValueOnce(staffUser);
    listModulesMock.mockRejectedValueOnce(new Error("fetch failed"));

    await expect(
      StaffModuleManagePage({
        params: Promise.resolve({ moduleId: "11" }),
      }),
    ).rejects.toBeInstanceOf(RedirectSentinel);

    expect(listModulesMock).toHaveBeenCalledWith(7, { scope: "staff" });
    expect(redirectMock).toHaveBeenCalledWith("/staff/modules");
  });

  it("redirects when requested module is missing or not owner-managed", async () => {
    getCurrentUserMock.mockResolvedValue(staffUser);

    listModulesMock.mockResolvedValueOnce([
      { id: 44, accountRole: "OWNER", moduleCode: "CS44" },
    ] as Awaited<ReturnType<typeof listModules>>);

    await expect(
      StaffModuleManagePage({
        params: Promise.resolve({ moduleId: "11" }),
      }),
    ).rejects.toBeInstanceOf(RedirectSentinel);

    expect(redirectMock).toHaveBeenLastCalledWith("/staff/modules");

    listModulesMock.mockResolvedValueOnce([
      { id: 11, accountRole: "MEMBER", moduleCode: "CS11" },
    ] as Awaited<ReturnType<typeof listModules>>);

    await expect(
      StaffModuleManagePage({
        params: Promise.resolve({ moduleId: "11" }),
      }),
    ).rejects.toBeInstanceOf(RedirectSentinel);

    expect(redirectMock).toHaveBeenLastCalledWith("/modules/11");
  });

  it("renders manage page and passes created join code to module form", async () => {
    getCurrentUserMock.mockResolvedValueOnce(staffUser);
    listModulesMock.mockResolvedValueOnce([
      { id: 11, accountRole: "OWNER", moduleCode: "CS11" },
    ] as Awaited<ReturnType<typeof listModules>>);

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
    expect(screen.getByRole("link", { name: "Back to my modules" })).toHaveAttribute("href", "/staff/modules");
    expect(screen.getByTestId("module-form")).toHaveAttribute("data-mode", "edit");
    expect(screen.getByTestId("module-form")).toHaveAttribute("data-module-id", "11");
    expect(screen.getByTestId("module-form")).toHaveAttribute("data-workspace", "staff");
    expect(screen.getByTestId("module-form")).toHaveAttribute("data-created-join-code", "JOIN123");
  });
});
