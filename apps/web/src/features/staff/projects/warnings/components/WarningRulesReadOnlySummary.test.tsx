import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { WarningRulesReadOnlySummary } from "./WarningRulesReadOnlySummary";
import type { WarningConfigState } from "../types";

describe("WarningRulesReadOnlySummary", () => {
  it("renders base rules with enabled and disabled details", () => {
    const state: WarningConfigState = {
      attendance: { enabled: true, severity: "HIGH", minPercent: 80, lookbackDays: 30 },
      meetingFrequency: { enabled: false, severity: "MEDIUM", minPerWeek: 2, lookbackDays: 14 },
      contributionActivity: { enabled: true, severity: "LOW", minCommits: 3, lookbackDays: 99 },
    };

    render(<WarningRulesReadOnlySummary state={state} />);

    expect(screen.getByText("Attendance")).toBeInTheDocument();
    expect(screen.getByText("Meeting frequency")).toBeInTheDocument();
    expect(screen.getByText("Contribution activity")).toBeInTheDocument();

    expect(screen.getByText("Severity HIGH; minimum 80% over Last 30 days")).toBeInTheDocument();
    expect(screen.getByText("Not evaluated while disabled.")).toBeInTheDocument();
    expect(
      screen.getByText("Severity LOW; minimum 3 commit(s) over 99 days"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Additional rules")).not.toBeInTheDocument();
  });

  it("renders additional rules when provided", () => {
    const state: WarningConfigState = {
      attendance: { enabled: true, severity: "HIGH", minPercent: 30, lookbackDays: 7 },
      meetingFrequency: { enabled: true, severity: "MEDIUM", minPerWeek: 1, lookbackDays: 14 },
      contributionActivity: { enabled: false, severity: "MEDIUM", minCommits: 4, lookbackDays: 14 },
    };

    render(
      <WarningRulesReadOnlySummary
        state={state}
        extraRules={[
          { key: "NEW_RULE", enabled: true, severity: "LOW" },
          { key: "ANOTHER_RULE", enabled: false },
        ]}
      />,
    );

    expect(screen.getByText("Additional rules")).toBeInTheDocument();
    expect(screen.getByText("NEW_RULE")).toBeInTheDocument();
    expect(screen.getByText(/enabled/)).toBeInTheDocument();
    expect(screen.getByText(/LOW/)).toBeInTheDocument();
    const disabledRule = screen.getByText("ANOTHER_RULE").closest("p");
    expect(disabledRule).not.toBeNull();
    expect(disabledRule).toHaveTextContent("disabled");
  });
});
