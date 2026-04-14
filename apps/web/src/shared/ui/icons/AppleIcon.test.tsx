import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AppleIcon } from "./AppleIcon";

describe("AppleIcon", () => {
  it("renders expected svg primitives and forwards svg props", () => {
    const { container } = render(<AppleIcon data-testid="apple" className="brand-icon" />);
    const svg = container.querySelector("svg");

    expect(svg).toHaveAttribute("viewBox", "0 0 24 24");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveClass("brand-icon");
    expect(svg).toHaveAttribute("data-testid", "apple");
    expect(container.querySelectorAll("path")).toHaveLength(2);
  });
});
