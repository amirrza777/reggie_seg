import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AnchorLink } from "./AnchorLink";

describe("AnchorLink", () => {
  it("scrolls to hash targets and prevents default for plain left clicks", () => {
    const target = document.createElement("div");
    target.id = "target";
    target.scrollIntoView = vi.fn();
    document.body.appendChild(target);

    render(<AnchorLink href="#target">Jump</AnchorLink>);
    const link = screen.getByRole("link", { name: "Jump" });

    const event = new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 });
    link.dispatchEvent(event);

    expect(target.scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
    expect(event.defaultPrevented).toBe(true);
  });

  it("does not auto-scroll for modified clicks, empty hash, or missing target", () => {
    render(
      <>
        <AnchorLink href="#">Empty hash</AnchorLink>
        <AnchorLink href="#target">Modified hash</AnchorLink>
        <AnchorLink href="#missing">Missing target</AnchorLink>
      </>,
    );

    const emptyHash = screen.getByRole("link", { name: "Empty hash" });
    const emptyHashEvent = new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 });
    emptyHash.dispatchEvent(emptyHashEvent);
    expect(emptyHashEvent.defaultPrevented).toBe(false);

    const modified = screen.getByRole("link", { name: "Modified hash" });
    const modifiedEvent = new MouseEvent("click", { bubbles: true, cancelable: true, button: 0, ctrlKey: true });
    modified.dispatchEvent(modifiedEvent);
    expect(modifiedEvent.defaultPrevented).toBe(false);

    const missing = screen.getByRole("link", { name: "Missing target" });
    const missingEvent = new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 });
    missing.dispatchEvent(missingEvent);
    expect(missingEvent.defaultPrevented).toBe(false);
  });

  it("respects external onClick preventDefault", () => {
    const onClick = vi.fn((event: { preventDefault: () => void }) => event.preventDefault());
    render(<AnchorLink href="#target" onClick={onClick}>With handler</AnchorLink>);
    const link = screen.getByRole("link", { name: "With handler" });

    fireEvent.click(link);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
