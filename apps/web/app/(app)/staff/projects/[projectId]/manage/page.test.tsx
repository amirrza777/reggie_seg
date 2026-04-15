import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getStaffProjectManage } from "@/features/projects/api/client";
import { getProjectWarningsConfig } from "@/features/staff/projects/warnings/api/client";
import { getFeatureFlagMap } from "@/shared/featureFlags";
import StaffProjectManagePage from "./page";

vi.mock("@/features/projects/api/client", () => ({
  getStaffProjectManage: vi.fn(),
}));

vi.mock("@/features/staff/projects/warnings/api/client", () => ({
  getProjectWarningsConfig: vi.fn(),
}));

vi.mock("@/shared/featureFlags", () => ({
  getFeatureFlagMap: vi.fn(),
}));

vi.mock("@/features/staff/projects/components/manage/StaffProjectManageSetupSections", () => ({
  StaffProjectManageSetupSections: (props: { projectId: number; warningsOk: boolean }) => (
    <div data-testid="sections" data-project={String(props.projectId)} data-warnings={String(props.warningsOk)} />
  ),
}));

const getManageMock = vi.mocked(getStaffProjectManage);
const getFlagsMock = vi.mocked(getFeatureFlagMap);
const getWarningsMock = vi.mocked(getProjectWarningsConfig);

describe("StaffProjectManagePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getManageMock.mockResolvedValue({
      id: 8,
      name: "Proj",
      canMutateProjectSettings: true,
    } as Awaited<ReturnType<typeof getStaffProjectManage>>);
    getFlagsMock.mockResolvedValue({});
    getWarningsMock.mockResolvedValue({ warningsConfig: {} } as Awaited<ReturnType<typeof getProjectWarningsConfig>>);
  });

  it("parses project id and passes flags into setup sections", async () => {
    const page = await StaffProjectManagePage({ params: Promise.resolve({ projectId: "8" }) });
    render(page);
    expect(screen.getByTestId("sections")).toHaveAttribute("data-project", "8");
    expect(screen.getByTestId("sections")).toHaveAttribute("data-warnings", "true");
  });

  it("surfaces warnings fetch failures without throwing", async () => {
    getWarningsMock.mockRejectedValueOnce(new Error("network"));
    const page = await StaffProjectManagePage({ params: Promise.resolve({ projectId: "8" }) });
    render(page);
    expect(screen.getByTestId("sections")).toHaveAttribute("data-warnings", "false");
  });
});
