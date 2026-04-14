import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePathname } from "next/navigation";
import { ScrollReveal } from "./ScrollReveal";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
}));

type ObserverRecord = {
  callback: IntersectionObserverCallback;
  observe: ReturnType<typeof vi.fn>;
  unobserve: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
};

const observerRecords: ObserverRecord[] = [];
const usePathnameMock = vi.mocked(usePathname);

function setRect(element: Element, top: number, left = 0) {
  Object.defineProperty(element, "getBoundingClientRect", {
    configurable: true,
    value: () => ({
      x: left,
      y: top,
      width: 100,
      height: 20,
      top,
      left,
      right: left + 100,
      bottom: top + 20,
      toJSON: () => ({}),
    }),
  });
}

describe("ScrollReveal", () => {
  beforeEach(() => {
    observerRecords.length = 0;
    vi.useFakeTimers();
    usePathnameMock.mockReturnValue("/");

    vi.stubGlobal(
      "IntersectionObserver",
      class {
        private readonly record: ObserverRecord;

        constructor(callback: IntersectionObserverCallback) {
          this.record = {
            callback,
            observe: vi.fn(),
            unobserve: vi.fn(),
            disconnect: vi.fn(),
          };
          observerRecords.push(this.record);
        }

        observe = (element: Element) => {
          this.record.observe(element);
        };

        unobserve = (element: Element) => {
          this.record.unobserve(element);
        };

        disconnect = () => {
          this.record.disconnect();
        };
      },
    );

    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback: FrameRequestCallback) => {
      return window.setTimeout(() => callback(0), 0);
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id: number) => {
      window.clearTimeout(id);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
    document.documentElement.classList.remove("reveal-ready");
  });

  it("returns early when no elements match selector", () => {
    render(<ScrollReveal selector="[data-not-present]" />);

    expect(observerRecords).toHaveLength(0);
    expect(document.documentElement).not.toHaveClass("reveal-ready");
  });

  it("reveals above-fold elements, keeps manual delay, and cleans auto delay on unmount", () => {
    const { unmount } = render(
      <>
        <div data-testid="first" data-reveal />
        <div data-testid="second" data-reveal />
        <ScrollReveal />
      </>,
    );

    const first = screen.getByTestId("first");
    const second = screen.getByTestId("second");

    setRect(first, 120, 50);
    setRect(second, 220, 10);
    first.style.setProperty("--reveal-delay", "99ms");

    act(() => {
      vi.runAllTimers();
    });

    expect(document.documentElement).toHaveClass("reveal-ready");
    expect(second.classList.contains("is-visible")).toBe(true);
    expect(first.classList.contains("is-visible")).toBe(true);
    expect(first.style.getPropertyValue("--reveal-delay")).toBe("99ms");
    expect(second.dataset.autoRevealDelay).toBe("1");

    unmount();

    expect(document.documentElement).not.toHaveClass("reveal-ready");
    expect(first.style.getPropertyValue("--reveal-delay")).toBe("99ms");
    expect(second.style.getPropertyValue("--reveal-delay")).toBe("");
    expect(second.dataset.autoRevealDelay).toBeUndefined();
  });

  it("reveals below-fold entries via observer and grouped children via group observer", () => {
    render(
      <>
        <div data-testid="below" data-reveal />
        <section data-testid="group" data-reveal-group>
          <div data-testid="group-a" data-reveal />
          <div data-testid="group-b" data-reveal />
        </section>
        <ScrollReveal />
      </>,
    );

    const below = screen.getByTestId("below");
    const group = screen.getByTestId("group");
    const groupA = screen.getByTestId("group-a");
    const groupB = screen.getByTestId("group-b");

    setRect(below, 1400, 20);
    setRect(group, 1300, 0);
    setRect(groupA, 1310, 40);
    setRect(groupB, 1400, 10);
    groupA.style.setProperty("--reveal-delay", "40ms");
    groupA.dataset.autoRevealDelay = "1";

    act(() => {
      vi.runOnlyPendingTimers();
    });

    expect(observerRecords.length).toBeGreaterThanOrEqual(2);

    act(() => {
      observerRecords[0].callback(
        [
          {
            target: groupA,
            isIntersecting: true,
            boundingClientRect: groupA.getBoundingClientRect(),
          } as IntersectionObserverEntry,
          {
            target: below,
            isIntersecting: true,
            boundingClientRect: below.getBoundingClientRect(),
          } as IntersectionObserverEntry,
        ],
        {} as IntersectionObserver,
      );
      vi.runOnlyPendingTimers();
    });

    expect(below.classList.contains("is-visible")).toBe(true);
    expect(observerRecords[0].unobserve).toHaveBeenCalledWith(below);

    act(() => {
      observerRecords[1].callback(
        [
          {
            target: group,
            isIntersecting: true,
            boundingClientRect: group.getBoundingClientRect(),
          } as IntersectionObserverEntry,
        ],
        {} as IntersectionObserver,
      );
      vi.runOnlyPendingTimers();
    });

    expect(groupA.classList.contains("is-visible")).toBe(true);
    expect(groupB.classList.contains("is-visible")).toBe(true);
    expect(observerRecords[0].unobserve).toHaveBeenCalledWith(groupA);
    expect(observerRecords[0].unobserve).toHaveBeenCalledWith(groupB);
    expect(observerRecords[1].disconnect).not.toHaveBeenCalled();
  });

  it("cancels pending animation frame work when unmounting before first frame", () => {
    const cancelSpy = vi.spyOn(window, "cancelAnimationFrame");

    const { unmount } = render(
      <>
        <div data-testid="pending" data-reveal />
        <ScrollReveal />
      </>,
    );

    unmount();
    expect(cancelSpy).toHaveBeenCalledTimes(1);
  });

  it("does not unobserve entries when once is false", () => {
    render(
      <>
        <div data-testid="target" data-reveal />
        <ScrollReveal once={false} />
      </>,
    );

    const target = screen.getByTestId("target");
    setRect(target, 1400, 0);

    act(() => {
      vi.runOnlyPendingTimers();
    });

    act(() => {
      observerRecords[0].callback(
        [
          {
            target,
            isIntersecting: true,
            boundingClientRect: target.getBoundingClientRect(),
          } as IntersectionObserverEntry,
        ],
        {} as IntersectionObserver,
      );
      vi.runOnlyPendingTimers();
    });

    expect(target.classList.contains("is-visible")).toBe(true);
    expect(observerRecords[0].unobserve).not.toHaveBeenCalledWith(target);
  });

  it("reinitializes reveal observers when pathname changes", () => {
    const { rerender } = render(
      <>
        <div data-testid="route-a" data-reveal />
        <ScrollReveal />
      </>,
    );

    const routeA = screen.getByTestId("route-a");
    setRect(routeA, 120, 0);

    act(() => {
      vi.runAllTimers();
    });
    expect(routeA.classList.contains("is-visible")).toBe(true);

    usePathnameMock.mockReturnValue("/features");
    rerender(
      <>
        <div data-testid="route-b" data-reveal />
        <ScrollReveal />
      </>,
    );

    const routeB = screen.getByTestId("route-b");
    setRect(routeB, 120, 0);

    act(() => {
      vi.runAllTimers();
    });
    expect(routeB.classList.contains("is-visible")).toBe(true);
  });
});
