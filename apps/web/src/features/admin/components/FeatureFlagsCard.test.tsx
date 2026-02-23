import { render, screen, waitFor } from "@testing-library/react";
import { vi, type MockedFunction } from "vitest";

vi.mock("../api/client", () => ({ listFeatureFlags: vi.fn() }));

import { listFeatureFlags } from "../api/client";
import { FeatureFlagsCard } from "./FeatureFlagsCard";

const listMock = listFeatureFlags as MockedFunction<typeof listFeatureFlags>;

beforeEach(() => {
  vi.clearAllMocks();
  listMock.mockResolvedValue([]);
});

describe("FeatureFlagsCard", () => {
  it("shows fallback flags when API returns empty list", async () => {
    render(<FeatureFlagsCard />);
    await waitFor(() => expect(listMock).toHaveBeenCalled());
    expect(screen.getByText(/repos/i)).toBeInTheDocument();
    expect(screen.getByText(/peer feedback/i)).toBeInTheDocument();
  });

  it("replaces flags with API response", async () => {
    listMock.mockResolvedValue([{ key: "new", label: "New Flag", enabled: false }]);
    render(<FeatureFlagsCard />);
    await waitFor(() => expect(screen.getByText("New Flag")).toBeInTheDocument());
    expect(screen.queryByText(/repos/i)).not.toBeInTheDocument();
  });

  it("shows error message when fetch fails", async () => {
    listMock.mockRejectedValue(new Error("broken"));
    render(<FeatureFlagsCard />);
    await waitFor(() => expect(screen.getByText(/broken/i)).toBeInTheDocument());
  });
});
