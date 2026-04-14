import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";
import { getModuleStaffList } from "@/features/modules/api/client";
import {
  loadStaffModuleWorkspaceContext,
  resolveStaffModuleWorkspaceAccess,
} from "@/features/modules/staffModuleWorkspaceLayoutData";
import { ApiError } from "@/shared/api/errors";
import StaffModuleStaffListPage from "./page";

class RedirectSentinel extends Error {}

vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new RedirectSentinel();
  }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));

vi.mock("@/features/modules/api/client", () => ({
  getModuleStaffList: vi.fn(),
}));

vi.mock("@/features/modules/staffModuleWorkspaceLayoutData", () => ({
  loadStaffModuleWorkspaceContext: vi.fn(),
  resolveStaffModuleWorkspaceAccess: vi.fn(),
}));

vi.mock("@/shared/ui/Card", () => ({
  Card: ({ title, children }: { title: ReactNode; children: ReactNode }) => (
    <section data-testid="card">
      <h3>{title}</h3>
      {children}
    </section>
  ),
}));

vi.mock("@/shared/ui/Table", () => ({
  Table: () => <div data-testid="table" />,
}));

const redirectMock = vi.mocked(redirect);
const loadCtxMock = vi.mocked(loadStaffModuleWorkspaceContext);
const resolveAccessMock = vi.mocked(resolveStaffModuleWorkspaceAccess);
const getStaffListMock = vi.mocked(getModuleStaffList);

const baseCtx = {
  user: { id: 1, isStaff: true, role: "STAFF" },
  moduleId: "9",
  parsedModuleId: 9,
  moduleRecord: { id: "9", title: "M", accountRole: "OWNER" },
  module: { id: "9", title: "M", accountRole: "OWNER" },
  isElevated: false,
  isEnterpriseAdmin: false,
} as Awaited<ReturnType<typeof loadStaffModuleWorkspaceContext>>;

describe("StaffModuleStaffListPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadCtxMock.mockResolvedValue(baseCtx);
    resolveAccessMock.mockReturnValue({
      canEdit: true,
      staffModuleSetup: true,
      enterpriseModuleEditor: false,
    } as ReturnType<typeof resolveStaffModuleWorkspaceAccess>);
  });

  it("redirects when workspace context is missing", async () => {
    loadCtxMock.mockResolvedValueOnce(null);
    await expect(StaffModuleStaffListPage({ params: Promise.resolve({ moduleId: "9" }) })).rejects.toBeInstanceOf(
      RedirectSentinel,
    );
    expect(redirectMock).toHaveBeenCalledWith("/staff/modules");
  });

  it("shows permission denied when the staff list returns 403", async () => {
    getStaffListMock.mockRejectedValue(new ApiError("nope", { status: 403 }));
    const page = await StaffModuleStaffListPage({ params: Promise.resolve({ moduleId: "9" }) });
    render(page);
    expect(screen.getByText(/don't have permission/i)).toBeInTheDocument();
  });

  it("shows load failure for non-403 errors", async () => {
    getStaffListMock.mockRejectedValue(new Error("network"));
    const page = await StaffModuleStaffListPage({ params: Promise.resolve({ moduleId: "9" }) });
    render(page);
    expect(screen.getByText(/Could not load the staff list/i)).toBeInTheDocument();
  });

  it("renders the staff table when members exist", async () => {
    getStaffListMock.mockResolvedValue({
      members: [{ userId: 1, displayName: "A", email: "a@test", roles: ["LEAD"] }],
    });
    const page = await StaffModuleStaffListPage({ params: Promise.resolve({ moduleId: "9" }) });
    render(page);
    expect(screen.getByTestId("table")).toBeInTheDocument();
  });

  it("renders action links for editable staff setup and enterprise editor access", async () => {
    resolveAccessMock.mockReturnValueOnce({
      canEdit: true,
      staffModuleSetup: true,
      enterpriseModuleEditor: true,
    } as ReturnType<typeof resolveStaffModuleWorkspaceAccess>);
    getStaffListMock.mockResolvedValueOnce({ members: [] } as any);

    const page = await StaffModuleStaffListPage({ params: Promise.resolve({ moduleId: "9" }) });
    render(page);

    expect(screen.getByRole("link", { name: "Manage staff access" })).toHaveAttribute(
      "href",
      "/staff/modules/9/staff/access",
    );
    expect(screen.getByRole("link", { name: "Enterprise module editor" })).toHaveAttribute(
      "href",
      "/enterprise/modules/9/edit",
    );
    expect(screen.getByText(/Assign leads and TAs in/i)).toBeInTheDocument();
  });

  it("renders enterprise-only empty-state guidance when staff setup is unavailable", async () => {
    resolveAccessMock.mockReturnValueOnce({
      canEdit: true,
      staffModuleSetup: false,
      enterpriseModuleEditor: true,
    } as ReturnType<typeof resolveStaffModuleWorkspaceAccess>);
    getStaffListMock.mockResolvedValueOnce({ members: [] } as any);

    const page = await StaffModuleStaffListPage({ params: Promise.resolve({ moduleId: "9" }) });
    render(page);

    expect(screen.queryByRole("link", { name: "Manage staff access" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Enterprise module editor" })).toBeInTheDocument();
    expect(screen.getByText(/Assign leads and TAs in the/i)).toBeInTheDocument();
  });

  it("renders setup guidance without enterprise link when enterprise editor access is unavailable", async () => {
    resolveAccessMock.mockReturnValueOnce({
      canEdit: true,
      staffModuleSetup: true,
      enterpriseModuleEditor: false,
    } as ReturnType<typeof resolveStaffModuleWorkspaceAccess>);
    getStaffListMock.mockResolvedValueOnce({ members: [] } as any);

    const page = await StaffModuleStaffListPage({ params: Promise.resolve({ moduleId: "9" }) });
    render(page);

    expect(screen.getByRole("link", { name: "module settings" })).toHaveAttribute("href", "/staff/modules/9/manage");
    expect(screen.queryByRole("link", { name: "enterprise module editor" })).not.toBeInTheDocument();
  });

  it("hides enrollment guidance when viewer cannot edit", async () => {
    resolveAccessMock.mockReturnValueOnce({
      canEdit: false,
      staffModuleSetup: true,
      enterpriseModuleEditor: false,
    } as ReturnType<typeof resolveStaffModuleWorkspaceAccess>);
    getStaffListMock.mockResolvedValueOnce({ members: [] } as any);

    const page = await StaffModuleStaffListPage({ params: Promise.resolve({ moduleId: "9" }) });
    render(page);

    expect(screen.getByText("No module leads or teaching assistants are assigned yet.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "module settings" })).not.toBeInTheDocument();
  });

  it("renders fallback load-failed card when API response has no members payload", async () => {
    resolveAccessMock.mockReturnValueOnce({
      canEdit: false,
      staffModuleSetup: false,
      enterpriseModuleEditor: false,
    } as ReturnType<typeof resolveStaffModuleWorkspaceAccess>);
    getStaffListMock.mockResolvedValueOnce({} as any);

    const page = await StaffModuleStaffListPage({ params: Promise.resolve({ moduleId: "9" }) });
    render(page);

    expect(screen.getByText(/Could not load the staff list/i)).toBeInTheDocument();
  });
});
