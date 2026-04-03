import { render, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { AppProviders } from "./providers";

vi.mock("@/features/auth/context", () => ({
  UserProvider: ({ children }: { children: ReactNode }) => <div data-testid="user-provider">{children}</div>,
}));

describe("AppProviders", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalScrollRestoration = window.history.scrollRestoration;
  const originalLocation = window.location;
  const mockLocation: Pick<Location, "href" | "reload"> = {
    href: "http://localhost:3000/",
    reload: vi.fn(),
  };

  beforeAll(() => {
    Object.defineProperty(window, "location", {
      value: mockLocation,
      writable: true,
    });
  });

  afterAll(() => {
    Object.defineProperty(window, "location", {
      value: originalLocation,
    });
  });

  beforeEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
    mockLocation.reload = vi.fn();

    Object.defineProperty(window.history, "scrollRestoration", {
      configurable: true,
      writable: true,
      value: "auto",
    });
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;

    Object.defineProperty(window.history, "scrollRestoration", {
      configurable: true,
      writable: true,
      value: originalScrollRestoration,
    });

    const navigatorWithServiceWorker = navigator as Navigator & {
      serviceWorker?: { getRegistrations: () => Promise<Array<{ unregister: () => Promise<boolean> }>> };
    };

    delete navigatorWithServiceWorker.serviceWorker;
    delete (window as Window & { caches?: { keys: () => Promise<string[]>; delete: (key: string) => Promise<boolean> } }).caches;
  });

  it("wraps children with UserProvider and restores scroll restoration on unmount", () => {
    process.env.NODE_ENV = "test";

    const { getByTestId, unmount } = render(
      <AppProviders>
        <main data-testid="child">hello</main>
      </AppProviders>,
    );

    expect(getByTestId("user-provider")).toBeInTheDocument();
    expect(getByTestId("child")).toBeInTheDocument();
    expect(window.history.scrollRestoration).toBe("manual");

    unmount();

    expect(window.history.scrollRestoration).toBe("auto");
    expect(sessionStorage.getItem("tf_dev_cache_reset_v1")).toBeNull();
  });

  it("sets the development cache marker even when browser cache APIs are unavailable", async () => {
    process.env.NODE_ENV = "development";

    render(
      <AppProviders>
        <div>child</div>
      </AppProviders>,
    );

    await waitFor(() => {
      expect(sessionStorage.getItem("tf_dev_cache_reset_v1")).toBe("done");
    });
  });

  it("does not clear caches again when the development reset marker already exists", async () => {
    process.env.NODE_ENV = "development";
    sessionStorage.setItem("tf_dev_cache_reset_v1", "done");

    const getRegistrations = vi.fn();
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: { getRegistrations },
    });

    const keys = vi.fn();
    const del = vi.fn();
    Object.defineProperty(window, "caches", {
      configurable: true,
      value: { keys, delete: del },
    });

    render(
      <AppProviders>
        <div>child</div>
      </AppProviders>,
    );

    await waitFor(() => {
      expect(getRegistrations).not.toHaveBeenCalled();
      expect(keys).not.toHaveBeenCalled();
      expect(del).not.toHaveBeenCalled();
    });
  });

  it("checks service workers and caches without deleting when both are empty", async () => {
    process.env.NODE_ENV = "development";

    const getRegistrations = vi.fn().mockResolvedValue([]);
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: { getRegistrations },
    });

    const keys = vi.fn().mockResolvedValue([]);
    const del = vi.fn();
    Object.defineProperty(window, "caches", {
      configurable: true,
      value: { keys, delete: del },
    });

    render(
      <AppProviders>
        <div>child</div>
      </AppProviders>,
    );

    await waitFor(() => {
      expect(getRegistrations).toHaveBeenCalledTimes(1);
      expect(keys).toHaveBeenCalledTimes(1);
    });

    expect(del).not.toHaveBeenCalled();
    expect(mockLocation.reload).not.toHaveBeenCalled();
  });

  it("unregisters service workers, clears caches, and reloads when changes are found", async () => {
    process.env.NODE_ENV = "development";

    const unregister = vi.fn().mockResolvedValue(true);
    const getRegistrations = vi.fn().mockResolvedValue([{ unregister }]);
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: { getRegistrations },
    });

    const keys = vi.fn().mockResolvedValue(["cache-a", "cache-b"]);
    const del = vi.fn().mockResolvedValue(true);
    Object.defineProperty(window, "caches", {
      configurable: true,
      value: { keys, delete: del },
    });

    render(
      <AppProviders>
        <div>child</div>
      </AppProviders>,
    );

    await waitFor(() => {
      expect(unregister).toHaveBeenCalledTimes(1);
      expect(del).toHaveBeenNthCalledWith(1, "cache-a");
      expect(del).toHaveBeenNthCalledWith(2, "cache-b");
      expect(mockLocation.reload).toHaveBeenCalledTimes(1);
    });
  });
});
