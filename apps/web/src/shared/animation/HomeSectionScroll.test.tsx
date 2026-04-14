import { act, fireEvent, render } from "@testing-library/react";
import { usePathname, useSearchParams } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HomeSectionScroll } from "./HomeSectionScroll";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
  useSearchParams: vi.fn(),
}));

const usePathnameMock = vi.mocked(usePathname);
const useSearchParamsMock = vi.mocked(useSearchParams);

let rafId = 0;
let rafQueue = new Map<number, FrameRequestCallback>();

function queueRaf() {
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback: FrameRequestCallback) => {
    rafId += 1;
    rafQueue.set(rafId, callback);
    return rafId;
  });
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id: number) => {
    rafQueue.delete(id);
  });
}

function flushRaf(frames = 1) {
  for (let i = 0; i < frames; i += 1) {
    const next = rafQueue.entries().next().value as [number, FrameRequestCallback] | undefined;
    if (!next) return;
    const [id, callback] = next;
    rafQueue.delete(id);
    callback(0);
  }
}

function setScrollY(value: number) {
  Object.defineProperty(window, "scrollY", {
    value,
    configurable: true,
    writable: true,
  });
}

function setElementRect(element: Element, rect: Partial<DOMRect>) {
  vi.spyOn(element, "getBoundingClientRect").mockReturnValue({
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    width: 0,
    height: 0,
    toJSON: () => ({}),
    ...rect,
  } as DOMRect);
}

describe("HomeSectionScroll", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    rafId = 0;
    rafQueue = new Map<number, FrameRequestCallback>();
    queueRaf();
    usePathnameMock.mockReturnValue("/");
    useSearchParamsMock.mockReturnValue(new URLSearchParams());
    document.body.innerHTML = "";
    setScrollY(0);
  });

  it("scrolls to the section from URL query when mounted on home", () => {
    useSearchParamsMock.mockReturnValue(new URLSearchParams("section=features"));
    const scrollToSpy = vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);

    const header = document.createElement("header");
    header.className = "header";
    document.body.appendChild(header);
    setElementRect(header, { height: 80 });

    const target = document.createElement("section");
    target.id = "features";
    document.body.appendChild(target);
    setElementRect(target, { top: 500 });
    setScrollY(100);

    render(<HomeSectionScroll />);

    act(() => {
      flushRaf(1);
    });

    expect(scrollToSpy).toHaveBeenCalledWith({ top: 508, behavior: "smooth" });
  });

  it("retries section scroll and stops after cleanup when target is not present", () => {
    useSearchParamsMock.mockReturnValue(new URLSearchParams("section=missing"));
    const cancelSpy = vi.spyOn(window, "cancelAnimationFrame");
    const { unmount } = render(<HomeSectionScroll />);

    act(() => {
      flushRaf(25);
    });
    expect(window.requestAnimationFrame).toHaveBeenCalledTimes(20);

    unmount();
    expect(cancelSpy).not.toHaveBeenCalled();
  });

  it("ignores non-home routes and ignores non-matching/modified anchor clicks", () => {
    usePathnameMock.mockReturnValue("/staff/projects");
    const scrollToSpy = vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
    render(<HomeSectionScroll />);

    const anchor = document.createElement("a");
    anchor.href = "/?section=hero";
    anchor.addEventListener("click", (event) => event.preventDefault());
    const child = document.createElement("span");
    anchor.appendChild(child);
    document.body.appendChild(anchor);
    const plainTarget = document.createElement("div");
    document.body.appendChild(plainTarget);

    fireEvent.click(plainTarget);
    fireEvent.click(child);
    fireEvent.click(child, { ctrlKey: true });
    expect(scrollToSpy).not.toHaveBeenCalled();
  });

  it("captures home anchor clicks and scrolls to matching sections", () => {
    usePathnameMock.mockReturnValue("/");
    const scrollToSpy = vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);

    const target = document.createElement("section");
    target.id = "pricing";
    document.body.appendChild(target);
    setElementRect(target, { top: 260 });

    render(<HomeSectionScroll />);

    const homeLink = document.createElement("a");
    homeLink.href = "/?section=pricing";
    homeLink.addEventListener("click", (event) => event.preventDefault());
    const linkChild = document.createElement("span");
    homeLink.appendChild(linkChild);
    document.body.appendChild(homeLink);

    const externalLink = document.createElement("a");
    externalLink.href = "https://example.com/?section=pricing";
    externalLink.addEventListener("click", (event) => event.preventDefault());
    const externalChild = document.createElement("span");
    externalLink.appendChild(externalChild);
    document.body.appendChild(externalLink);

    fireEvent.click(externalChild);
    act(() => {
      flushRaf(1);
    });
    expect(scrollToSpy).not.toHaveBeenCalled();

    fireEvent.click(linkChild);
    act(() => {
      flushRaf(1);
    });
    expect(scrollToSpy).toHaveBeenCalledWith({ top: 248, behavior: "smooth" });
  });

  it("cancels an in-flight RAF when a new section scroll is scheduled", () => {
    useSearchParamsMock.mockReturnValue(new URLSearchParams("section=overview"));
    const cancelSpy = vi.spyOn(window, "cancelAnimationFrame");
    render(<HomeSectionScroll />);

    const homeLink = document.createElement("a");
    homeLink.href = "/?section=pricing";
    homeLink.addEventListener("click", (event) => event.preventDefault());
    const child = document.createElement("span");
    homeLink.appendChild(child);
    document.body.appendChild(homeLink);

    fireEvent.click(child);
    expect(cancelSpy).toHaveBeenCalledWith(1);
  });
});
