import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";
import { buildModuleDashboardData } from "@/features/modules/moduleDashboardData";
import { loadStaffModuleWorkspaceContext } from "@/features/modules/staffModuleWorkspaceLayoutData";
import StaffModuleMarksPage from "./page";

class RedirectSentinel extends Error {}

vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new RedirectSentinel();
  }),
}));

vi.mock("@/features/modules/staffModuleWorkspaceLayoutData", () => ({
  loadStaffModuleWorkspaceContext: vi.fn(),
}));

vi.mock("@/features/modules/moduleDashboardData", () => ({
  buildModuleDashboardData: vi.fn(),
}));

vi.mock("@/features/modules/components/dashboard/ModuleDashboardSections", () => ({
  ModuleMarksSection: ({ marksRows }: { marksRows: Array<{ id: number }> }) => (
    <div data-testid="module-marks" data-row-count={String(marksRows.length)} />
  ),
}), { virtual: true });

const redirectMock = vi.mocked(redirect);
const loadStaffModuleWorkspaceContextMock = vi.mocked(loadStaffModuleWorkspaceContext);
const buildModuleDashboardDataMock = vi.mocked(buildModuleDashboardData);

describe("StaffModuleMarksPage", () => {
  it("redirects to staff modules when module context is unavailable", async () => {
    loadStaffModuleWorkspaceContextMock.mockResolvedValueOnce(null);

    await expect(
      StaffModuleMarksPage({
        params: Promise.resolve({ moduleId: "22" }),
      }),
    ).rejects.toBeInstanceOf(RedirectSentinel);

    expect(redirectMock).toHaveBeenCalledWith("/staff/modules");
  });

  it("renders marks section from module dashboard data", async () => {
    loadStaffModuleWorkspaceContextMock.mockResolvedValueOnce({
      module: { id: 22, moduleCode: "CS501" },
    });
    buildModuleDashboardDataMock.mockReturnValueOnce({
      marksRows: [{ id: 1 }, { id: 2 }, { id: 3 }],
    } as ReturnType<typeof buildModuleDashboardData>);

    const page = await StaffModuleMarksPage({
      params: Promise.resolve({ moduleId: "22" }),
    });

    render(page);

    expect(loadStaffModuleWorkspaceContextMock).toHaveBeenCalledWith("22");
    expect(buildModuleDashboardDataMock).toHaveBeenCalled();
    expect(screen.getByRole("heading", { level: 2, name: "Marks" })).toBeInTheDocument();
    expect(screen.getByTestId("module-marks")).toHaveAttribute("data-row-count", "3");
  });
});
