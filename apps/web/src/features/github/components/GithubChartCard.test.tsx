import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GithubChartCard } from "./GithubChartCard";

describe("GithubChartCard", () => {
  it("renders plain title when info is not provided", () => {
    render(
      <GithubChartCard title="Weekly commits">
        <div>Chart body</div>
      </GithubChartCard>,
    );

    expect(screen.getByText("Weekly commits")).toBeInTheDocument();
    expect(screen.getByText("Chart body")).toBeInTheDocument();
  });

  it("renders info title, custom class, full size, and min chart width", () => {
    const { container } = render(
      <GithubChartCard
        title="Weekly commits"
        info={{
          title: "Info title",
          description: "desc",
          bullets: ["first"],
        }}
        className="extra-class"
        size="full"
        minChartWidth={720}
      >
        <div>Chart body</div>
      </GithubChartCard>,
    );

    const panel = container.querySelector(".github-chart-section__panel");
    const surface = container.querySelector(".github-chart-section__chart-surface");
    expect(panel?.className).toContain("github-chart-section__panel--full");
    expect(panel?.className).toContain("extra-class");
    expect(surface).toHaveStyle({ minWidth: "720px" });
    expect(screen.getByText("Weekly commits")).toBeInTheDocument();
  });
});
