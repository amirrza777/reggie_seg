import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EnterpriseFeatureFlagsPanel } from "./EnterpriseFeatureFlagsPanel";

describe("EnterpriseFeatureFlagsPanel", () => {
  it("renders flags and toggles enabled state", () => {
    const onToggle = vi.fn();
    render(
      <EnterpriseFeatureFlagsPanel
        flags={[
          { key: "peer_feedback", label: "Peer Feedback", enabled: true },
          { key: "forum_reports", label: "Forum Reports", enabled: false },
        ]}
        updating={{ forum_reports: true }}
        onToggle={onToggle}
      />,
    );

    expect(screen.getByText("Feature flags")).toBeInTheDocument();
    expect(screen.getByText("Enabled")).toBeInTheDocument();
    expect(screen.getByText("Disabled")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Saving..." })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Disable" }));
    expect(onToggle).toHaveBeenCalledWith("peer_feedback", false);
  });
});
