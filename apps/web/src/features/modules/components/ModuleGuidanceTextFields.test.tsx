import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CharacterCount, ModuleGuidanceTextFields } from "./ModuleGuidanceTextFields";

describe("ModuleGuidanceTextFields", () => {
  it("wires text updates for all guidance fields", () => {
    const onBriefTextChange = vi.fn();
    const onTimelineTextChange = vi.fn();
    const onExpectationsTextChange = vi.fn();
    const onReadinessNotesTextChange = vi.fn();

    render(
      <ModuleGuidanceTextFields
        briefText="Brief"
        timelineText="Timeline"
        expectationsText="Expectations"
        readinessNotesText="Readiness"
        maxLength={120}
        onBriefTextChange={onBriefTextChange}
        onTimelineTextChange={onTimelineTextChange}
        onExpectationsTextChange={onExpectationsTextChange}
        onReadinessNotesTextChange={onReadinessNotesTextChange}
      />,
    );

    fireEvent.change(screen.getByLabelText("Module brief"), { target: { value: "Updated brief" } });
    fireEvent.change(screen.getByLabelText("Timeline"), { target: { value: "Updated timeline" } });
    fireEvent.change(screen.getByLabelText("Module expectations"), { target: { value: "Updated expectations" } });
    fireEvent.change(screen.getByLabelText("Readiness notes"), { target: { value: "Updated readiness" } });

    expect(onBriefTextChange).toHaveBeenCalledWith("Updated brief");
    expect(onTimelineTextChange).toHaveBeenCalledWith("Updated timeline");
    expect(onExpectationsTextChange).toHaveBeenCalledWith("Updated expectations");
    expect(onReadinessNotesTextChange).toHaveBeenCalledWith("Updated readiness");
  });
});

describe("CharacterCount", () => {
  it("renders muted, warning, and danger tones based on length thresholds", () => {
    const { rerender } = render(<CharacterCount value={"a".repeat(8)} limit={10} />);
    expect(screen.getByText("8 / 10")).toHaveClass("enterprise-module-create__char-count--muted");

    rerender(<CharacterCount value={"a".repeat(9)} limit={10} />);
    expect(screen.getByText("9 / 10")).toHaveClass("enterprise-module-create__char-count--warning");

    rerender(<CharacterCount value={"a".repeat(10)} limit={10} />);
    expect(screen.getByText("10 / 10")).toHaveClass("enterprise-module-create__char-count--danger");
  });
});
