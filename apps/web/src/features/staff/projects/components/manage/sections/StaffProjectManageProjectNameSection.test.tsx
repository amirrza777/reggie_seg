import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { StaffProjectManageSummary } from "@/features/projects/types";
import { StaffProjectManageSetupProvider } from "../StaffProjectManageSetupContext";
import { StaffProjectManageProjectNameSection } from "./StaffProjectManageProjectNameSection";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), replace: vi.fn() }),
}));

const patchMock = vi.fn();
vi.mock("@/features/projects/api/client", () => ({
  patchStaffProjectManage: (...a: unknown[]) => patchMock(...a),
  deleteStaffProjectManage: vi.fn(),
}));

vi.mock("@/features/enterprise/components/EnterpriseModuleFormFields", () => ({
  CharacterCount: () => null,
}));

vi.mock("../../StaffProjectManageFormCollapsible", () => ({
  StaffProjectManageFormCollapsible: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

const initial: StaffProjectManageSummary = {
  id: 1,
  name: "Old",
  archivedAt: null,
  moduleId: 2,
  moduleArchivedAt: null,
};

describe("StaffProjectManageProjectNameSection", () => {
  it("submits a new name from the form", async () => {
    const user = userEvent.setup();
    patchMock.mockResolvedValue({ ...initial, name: "New" });
    render(
      <StaffProjectManageSetupProvider projectId={1} initial={initial}>
        <StaffProjectManageProjectNameSection />
      </StaffProjectManageSetupProvider>,
    );
    const input = screen.getByRole("textbox", { name: "Project name" });
    await user.clear(input);
    await user.type(input, "New");
    await user.click(screen.getByRole("button", { name: /Save project name/i }));
    expect(patchMock).toHaveBeenCalledWith(1, { name: "New" });
  });
});
