import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePathname, useRouter } from "next/navigation";
import { NavigationPrefetch } from "./NavigationPrefetch";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
  useRouter: vi.fn(),
}));

const usePathnameMock = vi.mocked(usePathname);
const useRouterMock = vi.mocked(useRouter);

describe("NavigationPrefetch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    usePathnameMock.mockReturnValue("/staff/dashboard");
    Object.defineProperty(navigator, "connection", { value: undefined, configurable: true });
    Object.defineProperty(navigator, "mozConnection", { value: undefined, configurable: true });
    Object.defineProperty(navigator, "webkitConnection", { value: undefined, configurable: true });
    Object.defineProperty(navigator, "deviceMemory", { value: undefined, configurable: true });
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("normalizes targets, removes duplicates/current path, and prefetches up to the limit", () => {
    const prefetch = vi.fn();
    useRouterMock.mockReturnValue({ prefetch } as ReturnType<typeof useRouter>);

    render(
      <NavigationPrefetch
        hrefs={[
          " /staff/dashboard?tab=overview#metrics ",
          "/staff/projects?tab=all",
          "/staff/projects",
          "https://example.com/outside",
          "/staff/modules",
        ]}
        limit={2}
      />
    );

    vi.advanceTimersByTime(1);
    expect(prefetch).toHaveBeenNthCalledWith(1, "/staff/projects");

    vi.advanceTimersByTime(45);
    expect(prefetch).toHaveBeenNthCalledWith(2, "/staff/modules");

    vi.advanceTimersByTime(200);
    expect(prefetch).toHaveBeenCalledTimes(2);
  });

  it("skips prefetching on save-data or slow connection", () => {
    const prefetch = vi.fn();
    useRouterMock.mockReturnValue({ prefetch } as ReturnType<typeof useRouter>);
    Object.defineProperty(navigator, "connection", {
      value: { saveData: true, effectiveType: "3g" },
      configurable: true,
    });

    render(<NavigationPrefetch hrefs={["/staff/projects", "/staff/modules"]} />);
    vi.advanceTimersByTime(200);

    expect(prefetch).not.toHaveBeenCalled();
  });

  it("skips prefetching on low-memory devices and cancels pending timers on unmount", () => {
    const prefetch = vi.fn();
    useRouterMock.mockReturnValue({ prefetch } as ReturnType<typeof useRouter>);
    Object.defineProperty(navigator, "deviceMemory", { value: 2, configurable: true });

    const { unmount } = render(<NavigationPrefetch hrefs={["/staff/projects", "/staff/modules"]} />);
    unmount();

    vi.advanceTimersByTime(200);
    expect(prefetch).not.toHaveBeenCalled();
  });
});
