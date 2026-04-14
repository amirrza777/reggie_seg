import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { listEnterpriseFeatureFlags, updateEnterpriseFeatureFlag } from "../../api/client";
import { EnterpriseFeatureFlagsCard } from "./EnterpriseFeatureFlagsCard";

vi.mock("../../api/client", () => ({
  listEnterpriseFeatureFlags: vi.fn(),
  updateEnterpriseFeatureFlag: vi.fn(),
}));

vi.mock("./EnterpriseFeatureFlagsPanel", () => ({
  EnterpriseFeatureFlagsPanel: ({ flags, onToggle, updating }: {
    flags: Array<{ key: string; enabled: boolean; label: string }>;
    onToggle: (key: string, enabled: boolean) => void;
    updating: Record<string, boolean>;
  }) => (
    <div>
      <div data-testid="flag-count">{flags.length}</div>
      <div data-testid="first-flag-enabled">{String(flags[0]?.enabled ?? false)}</div>
      <div data-testid="first-flag-busy">{String(Boolean(updating[flags[0]?.key ?? ""]))}</div>
      <button type="button" onClick={() => onToggle(flags[0].key, !flags[0].enabled)}>
        Toggle first flag
      </button>
    </div>
  ),
}));

const listEnterpriseFeatureFlagsMock = vi.mocked(listEnterpriseFeatureFlags);
const updateEnterpriseFeatureFlagMock = vi.mocked(updateEnterpriseFeatureFlag);

const flags = [
  { key: "feature_a", label: "Feature A", enabled: true },
  { key: "feature_b", label: "Feature B", enabled: false },
];

describe("EnterpriseFeatureFlagsCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listEnterpriseFeatureFlagsMock.mockResolvedValue(flags as any);
    updateEnterpriseFeatureFlagMock.mockResolvedValue({ ...flags[0], enabled: false } as any);
  });

  it("loads flags and renders success state", async () => {
    render(<EnterpriseFeatureFlagsCard />);

    await waitFor(() => expect(screen.getByTestId("flag-count")).toHaveTextContent("2"));
    expect(screen.queryByText("Could not load flags.")).not.toBeInTheDocument();
  });

  it("shows load errors from API failures", async () => {
    listEnterpriseFeatureFlagsMock.mockRejectedValueOnce(new Error("load failed"));

    render(<EnterpriseFeatureFlagsCard />);

    await waitFor(() => expect(screen.getByText("load failed")).toBeInTheDocument());
    expect(screen.getByText("load failed").closest("div")?.className).toContain("status-alert--error");
  });

  it("optimistically toggles flags and commits success response", async () => {
    render(<EnterpriseFeatureFlagsCard />);
    await waitFor(() => expect(screen.getByTestId("first-flag-enabled")).toHaveTextContent("true"));

    fireEvent.click(screen.getByRole("button", { name: "Toggle first flag" }));

    expect(screen.getByTestId("first-flag-enabled")).toHaveTextContent("false");
    expect(updateEnterpriseFeatureFlagMock).toHaveBeenCalledWith("feature_a", false);
    await waitFor(() => expect(screen.getByTestId("first-flag-busy")).toHaveTextContent("false"));
  });

  it("rolls back optimistic updates when toggle fails", async () => {
    updateEnterpriseFeatureFlagMock.mockRejectedValueOnce(new Error("update failed"));

    render(<EnterpriseFeatureFlagsCard />);
    await waitFor(() => expect(screen.getByTestId("first-flag-enabled")).toHaveTextContent("true"));

    fireEvent.click(screen.getByRole("button", { name: "Toggle first flag" }));

    await waitFor(() => expect(screen.getByText("update failed")).toBeInTheDocument());
    expect(screen.getByTestId("first-flag-enabled")).toHaveTextContent("true");
  });

  it("falls back to generic messages for non-Error failures", async () => {
    listEnterpriseFeatureFlagsMock.mockRejectedValueOnce("bad payload" as never);
    const { unmount } = render(<EnterpriseFeatureFlagsCard />);
    await waitFor(() => expect(screen.getByText("Could not load flags.")).toBeInTheDocument());
    unmount();

    vi.clearAllMocks();
    listEnterpriseFeatureFlagsMock.mockResolvedValue(flags as any);
    updateEnterpriseFeatureFlagMock.mockRejectedValueOnce("network down" as never);

    render(<EnterpriseFeatureFlagsCard />);
    await waitFor(() => expect(screen.getByTestId("first-flag-enabled")).toHaveTextContent("true"));
    fireEvent.click(screen.getByRole("button", { name: "Toggle first flag" }));
    await waitFor(() => expect(screen.getByText("Could not update flag.")).toBeInTheDocument());
  });
});
