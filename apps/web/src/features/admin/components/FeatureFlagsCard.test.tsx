import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi, type MockedFunction } from "vitest";

vi.mock("../api/client", () => ({
  listFeatureFlags: vi.fn(),
  updateFeatureFlag: vi.fn(),
}));

import { listFeatureFlags, updateFeatureFlag } from "../api/client";
import { FeatureFlagsCard } from "./FeatureFlagsCard";

const listMock = listFeatureFlags as MockedFunction<typeof listFeatureFlags>;
const updateMock = updateFeatureFlag as MockedFunction<typeof updateFeatureFlag>;

describe("FeatureFlagsCard", () => {
  beforeEach(() => {
    listMock.mockReset();
    updateMock.mockReset();
  });

  it("renders an empty flags table when API returns no flags", async () => {
    listMock.mockResolvedValue([]);

    render(<FeatureFlagsCard />);

    await waitFor(() => expect(listMock).toHaveBeenCalled());
    expect(screen.getByText("Feature flags")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /enable/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /disable/i })).not.toBeInTheDocument();
  });

  it("renders flags from API and toggles one", async () => {
    listMock.mockResolvedValue([{ key: "repos", label: "Repositories", enabled: false }]);
    updateMock.mockResolvedValue({ key: "repos", label: "Repositories", enabled: true });

    render(<FeatureFlagsCard />);

    const button = await screen.findByRole("button", { name: "Enable" });
    fireEvent.click(button);

    await waitFor(() => expect(updateMock).toHaveBeenCalledWith("repos", true));
    expect(await screen.findByRole("button", { name: "Disable" })).toBeInTheDocument();
  });

  it("shows error message when fetch fails", async () => {
    listMock.mockRejectedValue(new Error("broken"));

    render(<FeatureFlagsCard />);

    expect(await screen.findByText(/broken/i)).toBeInTheDocument();
  });
});
