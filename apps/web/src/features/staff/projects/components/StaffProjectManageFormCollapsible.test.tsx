import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StaffProjectManageFormCollapsible } from "./StaffProjectManageFormCollapsible";

describe("StaffProjectManageFormCollapsible", () => {
  it("shows inner content when defaultOpen is true and toggles via summary", () => {
    render(
      <StaffProjectManageFormCollapsible title="Archive" defaultOpen>
        <p>Inside the panel</p>
      </StaffProjectManageFormCollapsible>,
    );
    expect(screen.getByText("Inside the panel")).toBeVisible();
    const summary = screen.getByText("Archive").closest("summary");
    expect(summary).toBeTruthy();
    fireEvent.click(summary!);
    const details = summary!.parentElement as HTMLDetailsElement;
    expect(details.open).toBe(false);
    fireEvent.click(summary!);
    expect(details.open).toBe(true);
  });

  it("syncs open state when defaultOpen prop changes", () => {
    const { rerender } = render(
      <StaffProjectManageFormCollapsible title="Section" defaultOpen={false}>
        <span>Body</span>
      </StaffProjectManageFormCollapsible>,
    );
    const details = screen.getByText("Section").closest("details") as HTMLDetailsElement;
    expect(details.open).toBe(false);
    rerender(
      <StaffProjectManageFormCollapsible title="Section" defaultOpen>
        <span>Body</span>
      </StaffProjectManageFormCollapsible>,
    );
    expect(details.open).toBe(true);
  });
});
