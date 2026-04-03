import { afterEach, describe, expect, it, vi } from "vitest";
import { createPortal } from "react-dom";
import { ModalPortal } from "./ModalPortal";

vi.mock("react-dom", () => ({
  createPortal: vi.fn((children) => children),
}));

describe("ModalPortal", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("creates a portal into document.body when document exists", () => {
    const child = <div>Modal content</div>;

    const result = ModalPortal({ children: child });

    expect(createPortal).toHaveBeenCalledWith(child, document.body);
    expect(result).not.toBeNull();
  });

  it("returns null when document is unavailable", () => {
    vi.stubGlobal("document", undefined);

    const result = ModalPortal({ children: <div>Modal content</div> });

    expect(result).toBeNull();
    expect(createPortal).not.toHaveBeenCalled();
  });
});
