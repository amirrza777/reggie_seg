import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StaffProjectManageSectionAlerts } from "./StaffProjectManageSectionAlerts";

describe("StaffProjectManageSectionAlerts", () => {
  it("renders nothing when there is no feedback", () => {
    const { container } = render(<StaffProjectManageSectionAlerts success={null} error={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders success and error alerts", () => {
    render(<StaffProjectManageSectionAlerts success="Saved" error="Oops" />);
    expect(screen.getByText("Saved")).toBeInTheDocument();
    expect(screen.getByText("Oops")).toBeInTheDocument();
  });
});
