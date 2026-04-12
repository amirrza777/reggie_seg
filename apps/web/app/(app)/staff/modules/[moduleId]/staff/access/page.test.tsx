import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";
import { loadModuleSetupInitialSelection } from "@/features/modules/lib/moduleSetupInitialSelection";
import {
  loadStaffModuleWorkspaceContext,
  resolveStaffModuleWorkspaceAccess,
} from "@/features/modules/staffModuleWorkspaceLayoutData";
import StaffModuleStaffAccessPage from "./page";

class RedirectSentinel extends Error {}

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new RedirectSentinel(url);
  }),
}));

vi.mock("@/features/modules/lib/moduleSetupInitialSelection", () => ({
  loadModuleSetupInitialSelection: vi.fn(),
}));

vi.mock("@/features/modules/staffModuleWorkspaceLayoutData", () => ({
  loadStaffModuleWorkspaceContext: vi.fn(),
  resolveStaffModuleWorkspaceAccess: vi.fn(),
}));

vi.mock("@/features/modules/components/moduleSetup/StaffModuleAccessForm", () => ({
  StaffModuleAccessForm: () => <div data-testid="access-form" />,
}));

vi.mock("@/shared/ui/Card", () => ({
  Card: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

const redirectMock = vi.mocked(redirect);
const loadCtxMock = vi.mocked(loadStaffModuleWorkspaceContext);
const resolveAccessMock = vi.mocked(resolveStaffModuleWorkspaceAccess);
const loadSelectionMock = vi.mocked(loadModuleSetupInitialSelection);

const ownerCtx = {
  user: { id: 1, isStaff: true, role: "STAFF" },
  moduleId: "11",
  parsedModuleId: 11,
  moduleRecord: { id: "11", title: "M", accountRole: "OWNER" },
  module: { id: "11", title: "M", accountRole: "OWNER" },
  isElevated: false,
  isEnterpriseAdmin: false,
} as Awaited<ReturnType<typeof loadStaffModuleWorkspaceContext>>;

describe("StaffModuleStaffAccessPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadCtxMock.mockResolvedValue(ownerCtx);
    resolveAccessMock.mockReturnValue({
      staffModuleSetup: true,
      canEdit: true,
    } as ReturnType<typeof resolveStaffModuleWorkspaceAccess>);
    loadSelectionMock.mockResolvedValue({ module: { name: "M" } } as Awaited<ReturnType<typeof loadModuleSetupInitialSelection>>);
  });

  it("redirects to staff modules when context is missing", async () => {
    loadCtxMock.mockResolvedValueOnce(null);
    await expect(StaffModuleStaffAccessPage({ params: Promise.resolve({ moduleId: "11" }) })).rejects.toBeInstanceOf(
      RedirectSentinel,
    );
    expect(redirectMock).toHaveBeenCalledWith("/staff/modules");
  });

  it("redirects to staff list when user cannot use staff module setup", async () => {
    resolveAccessMock.mockReturnValueOnce({
      staffModuleSetup: false,
      canEdit: true,
    } as ReturnType<typeof resolveStaffModuleWorkspaceAccess>);
    await expect(StaffModuleStaffAccessPage({ params: Promise.resolve({ moduleId: "11" }) })).rejects.toBeInstanceOf(
      RedirectSentinel,
    );
    expect(redirectMock).toHaveBeenCalledWith("/staff/modules/11/staff");
  });

  it("redirects when initial selection cannot be loaded", async () => {
    loadSelectionMock.mockResolvedValueOnce(null);
    await expect(StaffModuleStaffAccessPage({ params: Promise.resolve({ moduleId: "11" }) })).rejects.toBeInstanceOf(
      RedirectSentinel,
    );
  });

  it("renders the access form when checks pass", async () => {
    const page = await StaffModuleStaffAccessPage({ params: Promise.resolve({ moduleId: "11" }) });
    render(page);
    expect(screen.getByTestId("access-form")).toBeInTheDocument();
  });
});
