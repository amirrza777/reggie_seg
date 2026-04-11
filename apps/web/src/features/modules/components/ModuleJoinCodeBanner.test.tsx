import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ModuleJoinCodeBanner } from "./ModuleJoinCodeBanner";

describe("ModuleJoinCodeBanner", () => {
  beforeEach(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("copies join code and resets copied state after timer", async () => {
    render(<ModuleJoinCodeBanner joinCode="ZXCV1234" />);

    const button = screen.getByRole("button", { name: /Copy join code ZXCV1234/i });
    fireEvent.mouseEnter(button, { clientX: 20, clientY: 10 });
    expect(screen.getByRole("status")).toHaveTextContent("Copy");

    fireEvent.click(button);
    await waitFor(() => expect(navigator.clipboard.writeText as any).toHaveBeenCalledWith("ZXCV1234"));

    expect(screen.getByRole("button", { name: /Copied join code ZXCV1234/i })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Copied");
  });

  it("handles clipboard failures and focus tooltip interactions", async () => {
    const writeTextMock = vi.fn().mockRejectedValue(new Error("clipboard failed"));
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: writeTextMock },
    });

    render(<ModuleJoinCodeBanner joinCode="FAIL0001" />);

    const button = screen.getByRole("button", { name: /Copy join code FAIL0001/i });
    fireEvent.focus(button);
    expect(screen.getByRole("status").className).toContain("module-join-code-banner__tooltip--visible");

    fireEvent.click(button);
    await waitFor(() => expect(writeTextMock).toHaveBeenCalledWith("FAIL0001"));
    expect(screen.getByRole("button", { name: /Copy join code FAIL0001/i })).toBeInTheDocument();

    fireEvent.blur(button);
    expect(screen.getByRole("status").className).not.toContain("module-join-code-banner__tooltip--visible");
  });
});
