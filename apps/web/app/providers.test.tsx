import { render, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { AppProviders } from "./providers";

const usePathnameMock = vi.fn(() => "/register");

vi.mock("next/navigation", () => ({
  usePathname: () => usePathnameMock(),
}));

vi.mock("@/features/auth/context", () => ({
  UserProvider: ({ children }: { children: ReactNode }) => <div data-testid="user-provider">{children}</div>,
}));

describe("AppProviders", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalScrollRestoration = window.history.scrollRestoration;
  const originalLocation = window.location;
  const originalLocalStorage = window.localStorage;
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
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: originalLocalStorage,
    });
  });

  beforeEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: createStorageMock(),
    });
    mockLocation.reload = vi.fn();
    usePathnameMock.mockReturnValue("/register");

    (window as Window & { __NEXT_DATA__?: { buildId?: string } }).__NEXT_DATA__ = { buildId: "build-a" };

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
    delete (window as Window & { __NEXT_DATA__?: { buildId?: string } }).__NEXT_DATA__;
  });

  function createStorageMock(): Storage {
    const store = new Map<string, string>();
    return {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      clear: () => {
        store.clear();
      },
      key: (index: number) => Array.from(store.keys())[index] ?? null,
      get length() {
        return store.size;
      },
    };
  }

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
    expect(sessionStorage.getItem("tf_dev_cache_check_at")).toBeNull();
  });

  it("records a dev cache check timestamp even when browser cache APIs are unavailable", async () => {
    process.env.NODE_ENV = "development";
    localStorage.setItem("tf_last_build_id", "build-a");

    render(
      <AppProviders>
        <div>child</div>
      </AppProviders>,
    );

    await waitFor(() => {
      expect(Number(sessionStorage.getItem("tf_dev_cache_check_at"))).toBeGreaterThan(0);
    });
  });

  it("throttles repeated dev cache checks inside the check interval", async () => {
    process.env.NODE_ENV = "development";
    localStorage.setItem("tf_last_build_id", "build-a");
    sessionStorage.setItem("tf_dev_cache_check_at", String(Date.now()));

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
    localStorage.setItem("tf_last_build_id", "build-a");
    sessionStorage.setItem("tf_dev_cache_check_at", "0");

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

  it("unregisters service workers, clears caches, and reloads when stale assets are found in development", async () => {
    process.env.NODE_ENV = "development";
    localStorage.setItem("tf_last_build_id", "build-a");
    sessionStorage.setItem("tf_dev_cache_check_at", "0");

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

  it("clears stale service workers and caches once when the build id changes", async () => {
    process.env.NODE_ENV = "production";
    localStorage.setItem("tf_last_build_id", "build-a");
    (window as Window & { __NEXT_DATA__?: { buildId?: string } }).__NEXT_DATA__ = { buildId: "build-b" };

    const unregister = vi.fn().mockResolvedValue(true);
    const getRegistrations = vi.fn().mockResolvedValue([{ unregister }]);
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: { getRegistrations },
    });

    const keys = vi.fn().mockResolvedValue(["cache-a"]);
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
      expect(del).toHaveBeenCalledWith("cache-a");
      expect(mockLocation.reload).toHaveBeenCalledTimes(1);
    });

    expect(localStorage.getItem("tf_last_build_id")).toBe("build-b");
    expect(sessionStorage.getItem("tf_cache_reset_for_build_build-b")).toBe("done");
  });

  it("does not clear caches again when the build-change marker already exists", async () => {
    process.env.NODE_ENV = "production";
    localStorage.setItem("tf_last_build_id", "build-a");
    (window as Window & { __NEXT_DATA__?: { buildId?: string } }).__NEXT_DATA__ = { buildId: "build-b" };
    sessionStorage.setItem("tf_cache_reset_for_build_build-b", "done");

    const getRegistrations = vi.fn();
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: { getRegistrations },
    });

    const keys = vi.fn();
    Object.defineProperty(window, "caches", {
      configurable: true,
      value: { keys, delete: vi.fn() },
    });

    render(
      <AppProviders>
        <div>child</div>
      </AppProviders>,
    );

    await waitFor(() => {
      expect(getRegistrations).not.toHaveBeenCalled();
      expect(keys).not.toHaveBeenCalled();
      expect(mockLocation.reload).not.toHaveBeenCalled();
    });
  });

  it("extracts build id from next static script urls when __NEXT_DATA__ is unavailable", async () => {
    process.env.NODE_ENV = "production";
    localStorage.setItem("tf_last_build_id", "build-a");
    delete (window as Window & { __NEXT_DATA__?: { buildId?: string } }).__NEXT_DATA__;

    const script = document.createElement("script");
    script.setAttribute("src", "/_next/static/build-from-script/pages/index.js");
    document.body.appendChild(script);

    const unregister = vi.fn().mockResolvedValue(true);
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: { getRegistrations: vi.fn().mockResolvedValue([{ unregister }]) },
    });
    Object.defineProperty(window, "caches", {
      configurable: true,
      value: { keys: vi.fn().mockResolvedValue(["cache-a"]), delete: vi.fn().mockResolvedValue(true) },
    });

    render(
      <AppProviders>
        <div>child</div>
      </AppProviders>,
    );

    await waitFor(() => {
      expect(mockLocation.reload).toHaveBeenCalledTimes(1);
    });
    expect(localStorage.getItem("tf_last_build_id")).toBe("build-from-script");

    script.remove();
  });

  it("handles cache-clearing api errors without reloading", async () => {
    process.env.NODE_ENV = "development";
    localStorage.setItem("tf_last_build_id", "build-a");
    sessionStorage.setItem("tf_dev_cache_check_at", "0");

    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: { getRegistrations: vi.fn().mockRejectedValue(new Error("sw failed")) },
    });
    Object.defineProperty(window, "caches", {
      configurable: true,
      value: { keys: vi.fn().mockRejectedValue(new Error("cache failed")), delete: vi.fn() },
    });

    render(
      <AppProviders>
        <div>child</div>
      </AppProviders>,
    );

    await waitFor(() => {
      expect(mockLocation.reload).not.toHaveBeenCalled();
    });
  });

  it("does not throw when storage access fails and falls back to unknown build id", async () => {
    process.env.NODE_ENV = "production";
    const badStorage = {
      getItem: vi.fn(() => {
        throw new Error("storage get failed");
      }),
      setItem: vi.fn(() => {
        throw new Error("storage set failed");
      }),
      removeItem: vi.fn(),
      clear: vi.fn(),
      key: vi.fn(),
      length: 0,
    } as unknown as Storage;

    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: badStorage,
    });
    delete (window as Window & { __NEXT_DATA__?: { buildId?: string } }).__NEXT_DATA__;

    expect(() =>
      render(
        <AppProviders>
          <div>child</div>
        </AppProviders>,
      ),
    ).not.toThrow();
  });
});
