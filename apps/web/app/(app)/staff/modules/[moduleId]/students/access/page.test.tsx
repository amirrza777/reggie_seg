import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";
import { loadModuleSetupInitialSelection } from "@/features/modules/lib/moduleSetupInitialSelection";
import {
  loadStaffModuleWorkspaceContext,
  resolveStaffModuleWorkspaceAccess,
} from "@/features/modules/staffModuleWorkspaceLayoutData";
import StaffModuleStudentAccessPage from "./page";

class RedirectSentinel extends Error {}

vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new RedirectSentinel();
  }),
}));

vi.mock("@/features/modules/lib/moduleSetupInitialSelection", () => ({
  loadModuleSetupInitialSelection: vi.fn(),
}));

vi.mock("@/features/modules/staffModuleWorkspaceLayoutData", () => ({
  loadStaffModuleWorkspaceContext: vi.fn(),
  resolveStaffModuleWorkspaceAccess: vi.fn(),
}));

vi.mock("@/features/modules/components/moduleSetup/StaffModuleStudentAccessForm", () => ({
  StaffModuleStudentAccessForm: () => <div data-testid="student-access-form" />,
}));

const redirectMock = vi.mocked(redirect);
const loadCtxMock = vi.mocked(loadStaffModuleWorkspaceContext);
const resolveAccessMock = vi.mocked(resolveStaffModuleWorkspaceAccess);
const loadSelectionMock = vi.mocked(loadModuleSetupInitialSelection);

const ownerCtx = {
  user: { id: 1, isStaff: true, role: "STAFF" },
  moduleId: "12",
  parsedModuleId: 12,
  moduleRecord: { id: "12", title: "M", accountRole: "OWNER" },
  module: { id: "12", title: "M", accountRole: "OWNER" },
  isElevated: false,
  isEnterpriseAdmin: false,
} as Awaited<ReturnType<typeof loadStaffModuleWorkspaceContext>>;

describe("StaffModuleStudentAccessPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadCtxMock.mockResolvedValue(ownerCtx);
    resolveAccessMock.mockReturnValue({
      staffModuleSetup: true,
      canEdit: true,
    } as ReturnType<typeof resolveStaffModuleWorkspaceAccess>);
    loadSelectionMock.mockResolvedValue({ module: { name: "M" } } as Awaited<ReturnType<typeof loadModuleSetupInitialSelection>>);
  });

  it("redirects when workspace context is missing", async () => {
    loadCtxMock.mockResolvedValueOnce(null);
    await expect(StaffModuleStudentAccessPage({ params: Promise.resolve({ moduleId: "12" }) })).rejects.toBeInstanceOf(
      RedirectSentinel,
    );
    expect(redirectMock).toHaveBeenCalledWith("/staff/modules");
  });

  it("redirects when staff module setup is unavailable", async () => {
    resolveAccessMock.mockReturnValueOnce({
      staffModuleSetup: false,
      canEdit: true,
    } as ReturnType<typeof resolveStaffModuleWorkspaceAccess>);
    await expect(StaffModuleStudentAccessPage({ params: Promise.resolve({ moduleId: "12" }) })).rejects.toBeInstanceOf(
      RedirectSentinel,
    );
    expect(redirectMock).toHaveBeenCalledWith("/staff/modules/12/students");
  });

  it("renders the student access form when authorised", async () => {
    const page = await StaffModuleStudentAccessPage({ params: Promise.resolve({ moduleId: "12" }) });
    render(page);
    expect(screen.getByTestId("student-access-form")).toBeInTheDocument();
  });
});
