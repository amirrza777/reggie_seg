import { act, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePathname, useRouter } from "next/navigation";
import { Header } from "./Header";

vi.mock("next/link", () => ({
  default: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
  useRouter: vi.fn(),
}));

const usePathnameMock = vi.mocked(usePathname);
const useRouterMock = vi.mocked(useRouter);
const pushMock = vi.fn();

function setScrollY(value: number) {
  Object.defineProperty(window, "scrollY", {
    value,
    writable: true,
    configurable: true,
  });
}

function triggerScroll(value: number) {
  act(() => {
    setScrollY(value);
    fireEvent.scroll(window);
    vi.runOnlyPendingTimers();
  });
}

describe("Header", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePathnameMock.mockReturnValue("/");
    useRouterMock.mockReturnValue({ push: pushMock } as ReturnType<typeof useRouter>);
    setScrollY(0);
    vi.useFakeTimers();
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback: FrameRequestCallback) => {
      return window.setTimeout(() => callback(0), 0);
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id: number) => window.clearTimeout(id));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("hides on downward scroll and reappears on upward scroll", () => {
    const { container } = render(<Header />);
    const header = container.querySelector(".header");
    expect(header).not.toHaveClass("header--hidden");

    [44, 48, 52, 56, 60, 64].forEach((y) => {
      triggerScroll(y);
    });
    expect(header).toHaveClass("header--hidden");

    [62, 60, 58, 56, 54].forEach((y) => {
      triggerScroll(y);
    });
    expect(header).not.toHaveClass("header--hidden");
  });

  it("always shows near the top of the page", () => {
    const { container } = render(<Header />);
    const header = container.querySelector(".header");

    [44, 48, 52, 56, 60, 64].forEach((y) => {
      triggerScroll(y);
    });
    expect(header).toHaveClass("header--hidden");

    triggerScroll(10);
    expect(header).not.toHaveClass("header--hidden");
  });
});
