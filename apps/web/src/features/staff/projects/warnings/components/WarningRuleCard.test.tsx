import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WarningRuleCard } from "./WarningRuleCard";

describe("WarningRuleCard", () => {
  it("renders and propagates rule changes", () => {
    const onEnabledChange = vi.fn();
    const onSeverityChange = vi.fn();
    const onThresholdChange = vi.fn();
    const onLookbackDaysChange = vi.fn();

    render(
      <WarningRuleCard
        title="Attendance"
        enabled
        onEnabledChange={onEnabledChange}
        severity="HIGH"
        onSeverityChange={onSeverityChange}
        thresholdLabel="Minimum attendance (%)"
        thresholdValue={30}
        onThresholdChange={onThresholdChange}
        lookbackDays={30}
        onLookbackDaysChange={onLookbackDaysChange}
      />,
    );

    expect(screen.getByRole("heading", { name: "Attendance" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("checkbox"));
    expect(onEnabledChange).toHaveBeenCalledWith(false);

    const selects = screen.getAllByRole("combobox");
    fireEvent.change(selects[0], { target: { value: "LOW" } });
    expect(onSeverityChange).toHaveBeenCalledWith("LOW");

    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "42" } });
    expect(onThresholdChange).toHaveBeenCalledWith(42);

    fireEvent.change(selects[1], { target: { value: "14" } });
    expect(onLookbackDaysChange).toHaveBeenCalledWith(14);
  });

  it("falls back threshold value to min when input is invalid", () => {
    const onThresholdChange = vi.fn();

    render(
      <WarningRuleCard
        title="Contribution"
        enabled={false}
        onEnabledChange={vi.fn()}
        severity="MEDIUM"
        onSeverityChange={vi.fn()}
        thresholdLabel="Minimum commits"
        thresholdValue={4}
        onThresholdChange={onThresholdChange}
        thresholdMin={3}
        lookbackDays={14}
        onLookbackDaysChange={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "" } });
    expect(onThresholdChange).toHaveBeenCalledWith(3);
  });

  it("disables all controls when disabled=true", () => {
    render(
      <WarningRuleCard
        title="Meeting frequency"
        enabled
        onEnabledChange={vi.fn()}
        severity="MEDIUM"
        onSeverityChange={vi.fn()}
        thresholdLabel="Minimum meetings per week"
        thresholdValue={1}
        onThresholdChange={vi.fn()}
        lookbackDays={30}
        onLookbackDaysChange={vi.fn()}
        disabled
      />,
    );

    expect(screen.getByRole("checkbox")).toBeDisabled();
    for (const select of screen.getAllByRole("combobox")) {
      expect(select).toBeDisabled();
    }
    expect(screen.getByRole("spinbutton")).toBeDisabled();
  });
});
