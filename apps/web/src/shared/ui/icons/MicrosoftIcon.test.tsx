import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MicrosoftIcon } from "./MicrosoftIcon";

describe("MicrosoftIcon", () => {
  it("renders Microsoft tile quadrants and forwards props", () => {
    const { container } = render(<MicrosoftIcon data-testid="microsoft" className="brand-icon" />);
    const svg = container.querySelector("svg");
    const rects = container.querySelectorAll("rect");

    expect(svg).toHaveAttribute("viewBox", "0 0 21 21");
    expect(svg).toHaveAttribute("data-testid", "microsoft");
    expect(svg).toHaveClass("brand-icon");
    expect(rects).toHaveLength(4);
    expect(rects[0]).toHaveAttribute("fill", "#f25022");
    expect(rects[3]).toHaveAttribute("fill", "#ffb900");
  });
});
