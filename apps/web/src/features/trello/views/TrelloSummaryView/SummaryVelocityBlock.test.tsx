import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SummaryVelocityBlock } from "./SummaryVelocityBlock";
import type { VelocityStats } from "@/features/trello/lib/velocity";

describe("SummaryVelocityBlock", () => {
  it("shows this week, last week, and no change pill when percentChange is null", () => {
    const velocity: VelocityStats = { thisWeek: 2, lastWeek: 1, percentChange: null };
    render(<SummaryVelocityBlock velocity={velocity} />);
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(document.querySelector(".pill")).toBeNull();
  });

  it("shows pill with + for non-negative percent change", () => {
    const velocity: VelocityStats = { thisWeek: 4, lastWeek: 2, percentChange: 50 };
    render(<SummaryVelocityBlock velocity={velocity} />);
    const pill = document.querySelector(".pill");
    expect(pill).toHaveTextContent("+50%");
  });

  it("shows pill with - for negative percent change", () => {
    const velocity: VelocityStats = { thisWeek: 1, lastWeek: 4, percentChange: -25 };
    render(<SummaryVelocityBlock velocity={velocity} />);
    const pill = document.querySelector(".pill");
    expect(pill).toHaveTextContent("-25%");
  });
});
