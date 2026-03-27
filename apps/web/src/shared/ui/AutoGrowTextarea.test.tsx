import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { AutoGrowTextarea } from "./AutoGrowTextarea";

describe("AutoGrowTextarea", () => {
  it("renders with base and custom classes", () => {
    render(<AutoGrowTextarea aria-label="Notes" className="custom-class" />);
    expect(screen.getByLabelText("Notes")).toHaveClass("ui-autogrow-textarea");
    expect(screen.getByLabelText("Notes")).toHaveClass("custom-class");
  });

  it("forwards refs to callback and object refs", () => {
    const callbackRef = vi.fn();
    const objectRef = createRef<HTMLTextAreaElement>();

    const { rerender } = render(<AutoGrowTextarea aria-label="Callback ref" ref={callbackRef} />);
    expect(callbackRef).toHaveBeenCalledWith(expect.any(HTMLTextAreaElement));

    rerender(<AutoGrowTextarea aria-label="Object ref" ref={objectRef} />);
    expect(objectRef.current).toBeInstanceOf(HTMLTextAreaElement);
  });

  it("calls onInput and keeps height styles in sync", () => {
    const onInput = vi.fn();
    render(<AutoGrowTextarea aria-label="Body" defaultValue="hello" onInput={onInput} />);
    const textarea = screen.getByLabelText("Body");

    fireEvent.input(textarea, { target: { value: "hello world" } });

    expect(onInput).toHaveBeenCalledTimes(1);
    expect(textarea.style.height).toMatch(/px$/);
    expect(textarea.style.minHeight).toMatch(/px$/);
  });
});
