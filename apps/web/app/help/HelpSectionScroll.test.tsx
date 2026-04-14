import { act, fireEvent, render } from "@testing-library/react";
import { usePathname, useSearchParams } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HelpSectionScroll } from "./HelpSectionScroll";

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

describe("HelpSectionScroll", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    rafId = 0;
    rafQueue = new Map<number, FrameRequestCallback>();
    queueRaf();
    document.body.innerHTML = "";
    usePathnameMock.mockReturnValue("/help");
    useSearchParamsMock.mockReturnValue(new URLSearchParams());
  });

  it("scrolls target into view when no internal scroll container exists", () => {
    useSearchParamsMock.mockReturnValue(new URLSearchParams("section=faq"));

    const target = document.createElement("section");
    target.id = "faq";
    const scrollIntoViewSpy = vi.fn();
    target.scrollIntoView = scrollIntoViewSpy;
    document.body.appendChild(target);

    render(<HelpSectionScroll />);

    act(() => {
      flushRaf(1);
    });

    expect(scrollIntoViewSpy).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
  });

  it("scrolls an internal workspace container when present", () => {
    useSearchParamsMock.mockReturnValue(new URLSearchParams("section=getting-started"));

    const workspace = document.createElement("div");
    workspace.className = "app-shell__workspace";
    const scrollToSpy = vi.fn();
    workspace.scrollTo = scrollToSpy;
    Object.defineProperty(workspace, "scrollHeight", { value: 1200, configurable: true });
    Object.defineProperty(workspace, "clientHeight", { value: 600, configurable: true });
    Object.defineProperty(workspace, "scrollTop", { value: 40, configurable: true });
    vi.spyOn(window, "getComputedStyle").mockReturnValue({ overflowY: "auto" } as CSSStyleDeclaration);
    vi.spyOn(workspace, "getBoundingClientRect").mockReturnValue({ top: 100 } as DOMRect);
    document.body.appendChild(workspace);

    const target = document.createElement("section");
    target.id = "getting-started";
    vi.spyOn(target, "getBoundingClientRect").mockReturnValue({ top: 340 } as DOMRect);
    document.body.appendChild(target);

    render(<HelpSectionScroll />);

    act(() => {
      flushRaf(1);
    });

    expect(scrollToSpy).toHaveBeenCalledWith({ top: 268, behavior: "smooth" });
  });

  it("captures help anchor clicks and ignores non-help routes", () => {
    usePathnameMock.mockReturnValue("/help");
    const target = document.createElement("section");
    target.id = "support";
    target.scrollIntoView = vi.fn();
    document.body.appendChild(target);

    render(<HelpSectionScroll />);

    const helpLink = document.createElement("a");
    helpLink.href = "/help?section=support";
    helpLink.addEventListener("click", (event) => event.preventDefault());
    const child = document.createElement("span");
    helpLink.appendChild(child);
    document.body.appendChild(helpLink);

    fireEvent.click(child);
    act(() => {
      flushRaf(1);
    });
    expect(target.scrollIntoView).toHaveBeenCalled();

    usePathnameMock.mockReturnValue("/dashboard");
    const { unmount } = render(<HelpSectionScroll />);
    fireEvent.click(child);
    unmount();
    expect(window.requestAnimationFrame).toHaveBeenCalledTimes(2);
  });

  it("ignores modified/external clicks and retries bounded scroll attempts when target is missing", () => {
    render(<HelpSectionScroll />);

    const helpLink = document.createElement("a");
    helpLink.href = "/help?section=missing";
    const child = document.createElement("span");
    helpLink.appendChild(child);
    document.body.appendChild(helpLink);

    fireEvent.click(child, { ctrlKey: true });
    expect(window.requestAnimationFrame).toHaveBeenCalledTimes(0);

    fireEvent.click(child);
    act(() => {
      flushRaf(25);
    });
    expect(window.requestAnimationFrame).toHaveBeenCalledTimes(20);

    const external = document.createElement("a");
    external.href = "https://example.com/help?section=faq";
    const externalChild = document.createElement("span");
    external.appendChild(externalChild);
    document.body.appendChild(external);

    fireEvent.click(externalChild);
    expect(window.requestAnimationFrame).toHaveBeenCalledTimes(20);
  });

  it("cancels queued animation frames when scheduling a new section and on effect cleanup", () => {
    useSearchParamsMock.mockReturnValue(new URLSearchParams("section=missing"));
    const { rerender, unmount } = render(<HelpSectionScroll />);

    expect(window.requestAnimationFrame).toHaveBeenCalledTimes(1);

    useSearchParamsMock.mockReturnValue(new URLSearchParams("section=faq"));
    rerender(<HelpSectionScroll />);

    expect(window.cancelAnimationFrame).toHaveBeenCalled();
    unmount();
    expect(window.cancelAnimationFrame).toHaveBeenCalledTimes(2);
  });
});
