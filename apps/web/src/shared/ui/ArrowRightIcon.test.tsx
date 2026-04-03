import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ArrowRightIcon } from "./ArrowRightIcon";

describe("ArrowRightIcon", () => {
  it("renders right-facing icon by default", () => {
    const { container } = render(<ArrowRightIcon className="icon" />);
    const svg = container.querySelector("svg");

    expect(svg).toHaveClass("icon");
    expect(svg?.style.transform).toBe("");
  });

  it("rotates icon when direction is left", () => {
    const { container } = render(<ArrowRightIcon direction="left" />);
    const svg = container.querySelector("svg");

    expect(svg?.style.transform).toBe("rotate(180deg)");
  });
});
