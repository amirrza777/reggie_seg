import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FeatureFlagsPanel } from "./FeatureFlagsPanel";

describe("FeatureFlagsPanel", () => {
  it("renders status labels and toggles an enabled flag", () => {
    const onToggle = vi.fn();
    render(
      <FeatureFlagsPanel
        flags={[
          { key: "repos", label: "Repositories", enabled: true },
          { key: "trello", label: "Trello", enabled: false },
        ]}
        onToggle={onToggle}
        updating={{}}
      />,
    );

    expect(screen.getByText("Enabled")).toBeInTheDocument();
    expect(screen.getByText("Disabled")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Disable" }));
    expect(onToggle).toHaveBeenCalledWith("repos", false);
  });

  it("disables busy rows and shows saving text", () => {
    const onToggle = vi.fn();
    render(
      <FeatureFlagsPanel
        flags={[{ key: "peer_feedback", label: "Peer feedback", enabled: false }]}
        onToggle={onToggle}
        updating={{ peer_feedback: true }}
      />,
    );

    const button = screen.getByRole("button", { name: "Saving..." });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onToggle).not.toHaveBeenCalled();
  });
});
