import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";
import { getEnterpriseModuleJoinCode } from "@/features/enterprise/api/client";
import { getModuleStudentProjectMatrix } from "@/features/modules/api/client";
import {
  loadStaffModuleWorkspaceContext,
  resolveStaffModuleWorkspaceAccess,
} from "@/features/modules/staffModuleWorkspaceLayoutData";
import { ApiError } from "@/shared/api/errors";
import StaffModuleStudentsPage from "./page";

class RedirectSentinel extends Error {}

vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new RedirectSentinel();
  }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));

vi.mock("@/features/enterprise/api/client", () => ({
  getEnterpriseModuleJoinCode: vi.fn(),
}));

vi.mock("@/features/modules/api/client", () => ({
  getModuleStudentProjectMatrix: vi.fn(),
}));

vi.mock("@/features/modules/staffModuleWorkspaceLayoutData", () => ({
  loadStaffModuleWorkspaceContext: vi.fn(),
  resolveStaffModuleWorkspaceAccess: vi.fn(),
}));

vi.mock("@/features/modules/components/ModuleJoinCodeBanner", () => ({
  ModuleJoinCodeBanner: ({ joinCode }: { joinCode: string }) => <div data-testid="join-banner">{joinCode}</div>,
}));

vi.mock("@/features/modules/components/StaffModuleStudentProjectMatrix", () => ({
  StaffModuleStudentProjectMatrix: () => <div data-testid="matrix" />,
}));

vi.mock("@/shared/ui/Card", () => ({
  Card: ({ title, children }: { title: ReactNode; children: ReactNode }) => (
    <section aria-label={typeof title === "string" ? title : "card"}>{children}</section>
  ),
}));

const redirectMock = vi.mocked(redirect);
const loadCtxMock = vi.mocked(loadStaffModuleWorkspaceContext);
const resolveAccessMock = vi.mocked(resolveStaffModuleWorkspaceAccess);
const joinCodeMock = vi.mocked(getEnterpriseModuleJoinCode);
const matrixMock = vi.mocked(getModuleStudentProjectMatrix);

const baseCtx = {
  user: { id: 1, isStaff: true, role: "STAFF" },
  moduleId: "9",
  parsedModuleId: 9,
  moduleRecord: { id: "9", title: "M", accountRole: "OWNER" },
  module: { id: "9", title: "M", accountRole: "OWNER" },
  isElevated: false,
  isEnterpriseAdmin: false,
} as Awaited<ReturnType<typeof loadStaffModuleWorkspaceContext>>;

describe("StaffModuleStudentsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadCtxMock.mockResolvedValue(baseCtx);
    resolveAccessMock.mockReturnValue({
      canEdit: true,
      staffModuleSetup: true,
      enterpriseModuleEditor: false,
      isArchived: false,
    } as ReturnType<typeof resolveStaffModuleWorkspaceAccess>);
    joinCodeMock.mockResolvedValue({ joinCode: "ABC" });
    matrixMock.mockResolvedValue({
      projects: [{ id: 1, name: "P" }],
      students: [{ userId: 1, email: "s@test", displayName: "S", teamCells: [] }],
    } as Awaited<ReturnType<typeof getModuleStudentProjectMatrix>>);
  });

  it("redirects when workspace context is missing", async () => {
    loadCtxMock.mockResolvedValueOnce(null);
    await expect(StaffModuleStudentsPage({ params: Promise.resolve({ moduleId: "9" }) })).rejects.toBeInstanceOf(
      RedirectSentinel,
    );
    expect(redirectMock).toHaveBeenCalledWith("/staff/modules");
  });

  it("shows archived copy for join code when module is archived", async () => {
    resolveAccessMock.mockReturnValueOnce({
      canEdit: false,
      staffModuleSetup: true,
      enterpriseModuleEditor: false,
      isArchived: true,
    } as ReturnType<typeof resolveStaffModuleWorkspaceAccess>);
    const page = await StaffModuleStudentsPage({ params: Promise.resolve({ moduleId: "9" }) });
    render(page);
    expect(screen.getByText(/Self-enrollment is disabled/i)).toBeInTheDocument();
  });

  it("renders join banner and matrix on success", async () => {
    const page = await StaffModuleStudentsPage({ params: Promise.resolve({ moduleId: "9" }) });
    render(page);
    expect(screen.getByTestId("join-banner")).toHaveTextContent("ABC");
    expect(screen.getByTestId("matrix")).toBeInTheDocument();
  });

  it("treats join code 403 as missing code", async () => {
    joinCodeMock.mockRejectedValueOnce(new ApiError("forbidden", { status: 403 }));
    const page = await StaffModuleStudentsPage({ params: Promise.resolve({ moduleId: "9" }) });
    render(page);
    expect(screen.queryByTestId("join-banner")).not.toBeInTheDocument();
  });

  it("shows matrix permission error on 403", async () => {
    matrixMock.mockRejectedValueOnce(new ApiError("nope", { status: 403 }));
    const page = await StaffModuleStudentsPage({ params: Promise.resolve({ moduleId: "9" }) });
    render(page);
    expect(screen.getByText(/don't have permission to view student enrollment/i)).toBeInTheDocument();
  });

  it("shows matrix load-failed and project-empty states", async () => {
    matrixMock.mockRejectedValueOnce(new Error("matrix down"));
    const failedPage = await StaffModuleStudentsPage({ params: Promise.resolve({ moduleId: "9" }) });
    render(failedPage);
    expect(screen.getByText(/Could not load student and team data/i)).toBeInTheDocument();

    vi.clearAllMocks();
    loadCtxMock.mockResolvedValue(baseCtx);
    resolveAccessMock.mockReturnValue({
      canEdit: true,
      staffModuleSetup: true,
      enterpriseModuleEditor: false,
      isArchived: false,
    } as ReturnType<typeof resolveStaffModuleWorkspaceAccess>);
    joinCodeMock.mockResolvedValue({ joinCode: "ABC" });
    matrixMock.mockResolvedValueOnce({
      projects: [],
      students: [{ userId: 1, email: "s@test", displayName: "S", teamCells: [] }],
    } as any);

    const emptyProjectsPage = await StaffModuleStudentsPage({ params: Promise.resolve({ moduleId: "9" }) });
    render(emptyProjectsPage);
    expect(screen.getByText("This module has no projects yet.")).toBeInTheDocument();
  });

  it("renders student-empty guidance for setup and enterprise-editor variants", async () => {
    matrixMock.mockResolvedValueOnce({
      projects: [{ id: 1, name: "P" }],
      students: [],
    } as any);
    resolveAccessMock.mockReturnValueOnce({
      canEdit: true,
      staffModuleSetup: true,
      enterpriseModuleEditor: true,
      isArchived: false,
    } as ReturnType<typeof resolveStaffModuleWorkspaceAccess>);

    const setupPage = await StaffModuleStudentsPage({ params: Promise.resolve({ moduleId: "9" }) });
    render(setupPage);
    expect(screen.getByText(/Enroll students from/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Module settings" })).toHaveAttribute("href", "/staff/modules/9/manage");
    expect(screen.getAllByRole("link", { name: "enterprise module editor" }).length).toBeGreaterThan(0);

    vi.clearAllMocks();
    loadCtxMock.mockResolvedValue(baseCtx);
    resolveAccessMock.mockReturnValue({
      canEdit: true,
      staffModuleSetup: false,
      enterpriseModuleEditor: true,
      isArchived: false,
    } as ReturnType<typeof resolveStaffModuleWorkspaceAccess>);
    joinCodeMock.mockResolvedValue({ joinCode: "ABC" });
    matrixMock.mockResolvedValue({
      projects: [{ id: 1, name: "P" }],
      students: [],
    } as any);

    const enterpriseOnlyPage = await StaffModuleStudentsPage({ params: Promise.resolve({ moduleId: "9" }) });
    render(enterpriseOnlyPage);
    expect(screen.getByText(/Enroll students in the/i)).toBeInTheDocument();
  });

  it("renders student-empty setup guidance without enterprise-editor suffix when unavailable", async () => {
    resolveAccessMock.mockReturnValueOnce({
      canEdit: true,
      staffModuleSetup: true,
      enterpriseModuleEditor: false,
      isArchived: false,
    } as ReturnType<typeof resolveStaffModuleWorkspaceAccess>);
    matrixMock.mockResolvedValueOnce({
      projects: [{ id: 1, name: "P" }],
      students: [],
    } as any);

    const page = await StaffModuleStudentsPage({ params: Promise.resolve({ moduleId: "9" }) });
    render(page);

    expect(screen.getByText(/Enroll students from/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Module settings" })).toHaveAttribute("href", "/staff/modules/9/manage");
    expect(screen.queryByRole("link", { name: "enterprise module editor" })).not.toBeInTheDocument();
  });

  it("renders student-empty state without enrollment guidance when viewer cannot edit", async () => {
    resolveAccessMock.mockReturnValueOnce({
      canEdit: false,
      staffModuleSetup: true,
      enterpriseModuleEditor: false,
      isArchived: false,
    } as ReturnType<typeof resolveStaffModuleWorkspaceAccess>);
    matrixMock.mockResolvedValueOnce({
      projects: [{ id: 1, name: "P" }],
      students: [],
    } as any);

    const page = await StaffModuleStudentsPage({ params: Promise.resolve({ moduleId: "9" }) });
    render(page);

    expect(screen.getByText("No students are enrolled in this module yet.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Module settings" })).not.toBeInTheDocument();
  });

  it("renders no matrix card when matrix loader resolves null", async () => {
    matrixMock.mockResolvedValueOnce(null as any);

    const page = await StaffModuleStudentsPage({ params: Promise.resolve({ moduleId: "9" }) });
    render(page);

    expect(screen.queryByText("Students & project teams")).not.toBeInTheDocument();
  });
});
