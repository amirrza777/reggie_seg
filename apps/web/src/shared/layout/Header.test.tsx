import { act, fireEvent, render, screen } from "@testing-library/react";
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

  it("navigates home via router when not already on landing page", () => {
    usePathnameMock.mockReturnValue("/staff/dashboard");
    render(<Header />);

    fireEvent.click(document.querySelector('.logo[aria-label="Back to landing"]') as Element);
    expect(pushMock).toHaveBeenCalledWith("/");
  });

  it("renders top navigation links to dedicated overview pages", () => {
    render(<Header />);

    expect(screen.getByRole("link", { name: "Product" })).toHaveAttribute("href", "/product");
    expect(screen.getByRole("link", { name: "Features" })).toHaveAttribute("href", "/features");
    expect(screen.getByRole("link", { name: "Resources" })).toHaveAttribute("href", "/resources");
    expect(screen.getByRole("link", { name: "About" })).toHaveAttribute("href", "/about");
    expect(screen.getByRole("link", { name: "FAQ" })).toHaveAttribute("href", "/faq");
  });

  it("opens mobile menu and closes it with escape and desktop resize", () => {
    render(<Header />);

    const toggle = screen.getByRole("button", { name: "Toggle navigation" });
    fireEvent.click(toggle);
    expect(document.body.style.overflow).toBe("hidden");

    fireEvent.keyDown(window, { key: "Escape" });
    expect(document.body.style.overflow).toBe("");

    fireEvent.click(toggle);
    Object.defineProperty(window, "innerWidth", { value: 1200, configurable: true, writable: true });
    fireEvent(window, new Event("resize"));
    expect(document.body.style.overflow).toBe("");
  });

  it("cancels pending animation frame work on unmount", () => {
    const requestSpy = vi
      .spyOn(window, "requestAnimationFrame")
      .mockImplementation(() => 123 as unknown as number);
    const cancelSpy = vi.spyOn(window, "cancelAnimationFrame");

    const { unmount } = render(<Header />);
    act(() => {
      setScrollY(80);
      fireEvent.scroll(window);
      fireEvent.scroll(window);
    });

    expect(requestSpy).toHaveBeenCalledTimes(1);
    unmount();
    expect(cancelSpy).toHaveBeenCalledWith(123);
  });
});
