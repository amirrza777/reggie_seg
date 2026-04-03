import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi, type MockedFunction } from "vitest";

vi.mock("../api/client", () => ({
  getEnterpriseModuleJoinCode: vi.fn(),
}));

import { getEnterpriseModuleJoinCode } from "../api/client";
import { ModuleJoinCodeCard } from "./ModuleJoinCodeCard";

const getEnterpriseModuleJoinCodeMock = getEnterpriseModuleJoinCode as MockedFunction<typeof getEnterpriseModuleJoinCode>;

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("ModuleJoinCodeCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it("loads and renders the module join code", async () => {
    getEnterpriseModuleJoinCodeMock.mockResolvedValue({ moduleId: 12, joinCode: "ABCD2345" });

    render(<ModuleJoinCodeCard moduleId={12} />);

    expect(await screen.findByRole("button", { name: /copy code/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/module join code/i)).toHaveTextContent("ABCD2345");
  });

  it("renders from initial join code without fetching", () => {
    render(<ModuleJoinCodeCard moduleId={12} initialJoinCode="ABCD2345" />);

    expect(screen.getByRole("button", { name: /copy code/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/module join code/i)).toHaveTextContent("ABCD2345");
    expect(getEnterpriseModuleJoinCodeMock).not.toHaveBeenCalled();
  });

  it("shows the created banner only when requested", () => {
    render(<ModuleJoinCodeCard moduleId={12} initialJoinCode="ABCD2345" showCreatedBanner />);

    expect(screen.getByText(/module created\. students can now join with this code/i)).toBeInTheDocument();
  });

  it("copies the code from the join code banner", async () => {
    getEnterpriseModuleJoinCodeMock.mockResolvedValue({ moduleId: 12, joinCode: "ABCD2345" });

    render(<ModuleJoinCodeCard moduleId={12} />);

    fireEvent.click(await screen.findByRole("button", { name: /copy code/i }));

    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith("ABCD2345"));
  });

  it("renders an error state when loading fails", async () => {
    getEnterpriseModuleJoinCodeMock.mockRejectedValue(new Error("Forbidden"));

    render(<ModuleJoinCodeCard moduleId={12} />);

    expect(await screen.findByText(/forbidden/i)).toBeInTheDocument();
  });

  it("uses fallback error text when loading fails with a non-Error value", async () => {
    getEnterpriseModuleJoinCodeMock.mockRejectedValue("bad-response");

    render(<ModuleJoinCodeCard moduleId={12} />);

    expect(await screen.findByText("Could not load the module join code.")).toBeInTheDocument();
  });

  it("shows unavailable-copy message when clipboard APIs are missing", async () => {
    Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true });

    render(<ModuleJoinCodeCard moduleId={12} initialJoinCode="ABCD2345" />);
    fireEvent.click(screen.getByRole("button", { name: /copy code/i }));

    expect(screen.getByText("Copy is not available in this browser.")).toBeInTheDocument();
  });

  it("shows copy failure message when writeText rejects", async () => {
    getEnterpriseModuleJoinCodeMock.mockResolvedValue({ moduleId: 12, joinCode: "ABCD2345" });
    const writeTextMock = vi.fn().mockRejectedValue(new Error("denied"));
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextMock },
      configurable: true,
    });

    render(<ModuleJoinCodeCard moduleId={12} />);
    fireEvent.click(await screen.findByRole("button", { name: /copy code/i }));

    expect(await screen.findByText("Could not copy the join code.")).toBeInTheDocument();
  });

  it("ignores late success responses after unmount", async () => {
    const deferred = createDeferred<{ moduleId: number; joinCode: string }>();
    getEnterpriseModuleJoinCodeMock.mockReturnValue(deferred.promise);

    const { unmount } = render(<ModuleJoinCodeCard moduleId={12} />);
    unmount();

    await act(async () => {
      deferred.resolve({ moduleId: 12, joinCode: "LATE1234" });
      await deferred.promise;
    });

    expect(getEnterpriseModuleJoinCodeMock).toHaveBeenCalledTimes(1);
  });

  it("ignores late error responses after unmount", async () => {
    const deferred = createDeferred<{ moduleId: number; joinCode: string }>();
    getEnterpriseModuleJoinCodeMock.mockReturnValue(deferred.promise);

    const { unmount } = render(<ModuleJoinCodeCard moduleId={12} />);
    unmount();

    await act(async () => {
      deferred.reject(new Error("late failure"));
      await deferred.promise.catch(() => undefined);
    });

    expect(getEnterpriseModuleJoinCodeMock).toHaveBeenCalledTimes(1);
  });
});
