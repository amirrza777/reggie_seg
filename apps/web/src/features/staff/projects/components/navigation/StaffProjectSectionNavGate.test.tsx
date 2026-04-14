import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StaffProjectSectionNavGate } from "./StaffProjectSectionNavGate";

const usePathnameMock = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => usePathnameMock(),
}));

vi.mock("./StaffProjectSectionNav", () => ({
  StaffProjectSectionNav: ({
    projectId,
    moduleId,
    canManageProjectSettings,
  }: {
    projectId: string;
    moduleId: number | null;
    canManageProjectSettings?: boolean;
  }) => (
    <div data-testid="section-nav">
      {projectId}:{String(moduleId)}:{String(canManageProjectSettings)}
    </div>
  ),
}));

describe("StaffProjectSectionNavGate", () => {
  beforeEach(() => {
    usePathnameMock.mockReset();
  });

  it("returns nothing on team detail routes", () => {
    usePathnameMock.mockReturnValue("/staff/projects/9/teams/2");
    const { container } = render(<StaffProjectSectionNavGate projectId="9" moduleId={11} />);

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByTestId("section-nav")).not.toBeInTheDocument();
  });

  it("renders section navigation on non-team routes", () => {
    usePathnameMock.mockReturnValue("/staff/projects/9/manage");
    render(
      <StaffProjectSectionNavGate projectId="9" moduleId={11} canManageProjectSettings />
    );

    expect(screen.getByTestId("section-nav")).toHaveTextContent("9:11:true");
  });

  it("treats null pathname as empty and still renders navigation", () => {
    usePathnameMock.mockReturnValue(null);
    render(<StaffProjectSectionNavGate projectId="7" moduleId={null} />);

    expect(screen.getByTestId("section-nav")).toHaveTextContent("7:null:undefined");
  });
});
