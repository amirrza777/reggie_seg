import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OutlookIcon } from "./OutlookIcon";

describe("OutlookIcon", () => {
  it("renders layered outlook glyph and forwards svg props", () => {
    const { container } = render(<OutlookIcon data-testid="outlook" className="brand-icon" />);
    const svg = container.querySelector("svg");

    expect(svg).toHaveAttribute("viewBox", "0 0 24 24");
    expect(svg).toHaveAttribute("data-testid", "outlook");
    expect(svg).toHaveClass("brand-icon");
    expect(container.querySelectorAll("path")).toHaveLength(3);
    expect(container.querySelectorAll("ellipse")).toHaveLength(2);
    expect(container.querySelector("rect")).toHaveAttribute("fill", "#0078D4");
  });
});
