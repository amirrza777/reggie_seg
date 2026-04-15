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

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

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

  it("shows fallback fetch error text for non-Error failures", async () => {
    listMock.mockRejectedValue("bad-response");

    render(<FeatureFlagsCard />);

    expect(await screen.findByText("Could not load flags.")).toBeInTheDocument();
  });

  it("reverts optimistic toggle and shows fallback update message for non-Error failures", async () => {
    listMock.mockResolvedValue([{ key: "repos", label: "Repositories", enabled: false }]);
    updateMock.mockRejectedValue("toggle-failed");

    render(<FeatureFlagsCard />);

    fireEvent.click(await screen.findByRole("button", { name: "Enable" }));

    expect(await screen.findByText("Could not update flag.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enable" })).toBeInTheDocument();
    expect(document.querySelector(".status-alert--success")).not.toBeNull();
  });

  it("updates only the targeted flag when multiple rows are present", async () => {
    listMock.mockResolvedValue([
      { key: "repos", label: "Repositories", enabled: false },
      { key: "forum", label: "Forum", enabled: true },
    ]);
    updateMock.mockResolvedValue({ key: "repos", label: "Repositories", enabled: true });

    render(<FeatureFlagsCard />);
    fireEvent.click(await screen.findByRole("button", { name: "Enable" }));

    await waitFor(() => expect(updateMock).toHaveBeenCalledWith("repos", true));
    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: "Disable" })).toHaveLength(2);
    });
  });

  it("shows API error message when update fails with Error", async () => {
    listMock.mockResolvedValue([{ key: "repos", label: "Repositories", enabled: false }]);
    updateMock.mockRejectedValue(new Error("update broken"));

    render(<FeatureFlagsCard />);
    fireEvent.click(await screen.findByRole("button", { name: "Enable" }));

    expect(await screen.findByText("update broken")).toBeInTheDocument();
  });

  it("ignores late list responses after unmount", async () => {
    const deferred = createDeferred<Array<{ key: string; label: string; enabled: boolean }>>();
    listMock.mockReturnValue(deferred.promise as ReturnType<typeof listFeatureFlags>);

    const { unmount } = render(<FeatureFlagsCard />);
    unmount();

    deferred.resolve([{ key: "repos", label: "Repositories", enabled: false }]);
    await deferred.promise;

    expect(listMock).toHaveBeenCalledTimes(1);
  });

  it("ignores late list failures after unmount", async () => {
    const deferred = createDeferred<Array<{ key: string; label: string; enabled: boolean }>>();
    listMock.mockReturnValue(deferred.promise as ReturnType<typeof listFeatureFlags>);

    const { unmount } = render(<FeatureFlagsCard />);
    unmount();

    deferred.reject(new Error("late-failure"));
    await deferred.promise.catch(() => undefined);

    expect(listMock).toHaveBeenCalledTimes(1);
  });
});
