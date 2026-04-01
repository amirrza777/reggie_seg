import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ChartTooltipContent } from "./ChartTooltipContent";

describe("ChartTooltipContent", () => {
  it("returns null when inactive or payload is empty", () => {
    const { rerender, container } = render(<ChartTooltipContent active={false} payload={[]} />);
    expect(container).toBeEmptyDOMElement();

    rerender(<ChartTooltipContent active payload={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("filters hidden/null rows and formats label + entries", () => {
    const formatter = (value: unknown, name: unknown) => [`fmt:${String(value)}`, `name:${String(name)}`];
    const labelFormatter = (label: unknown) => `Label ${String(label)}`;

    render(
      <ChartTooltipContent
        active
        label="Week 1"
        className="custom-tooltip"
        formatter={formatter}
        labelFormatter={labelFormatter}
        payload={[
          { dataKey: "hidden", name: "Hidden", value: 10, hide: true, color: "#111" },
          { dataKey: "nullish", name: "Nullish", value: null, color: "#222" },
          { dataKey: "visible", name: "Velocity", value: 42, stroke: "#333" },
        ]}
      />
    );

    expect(screen.getByText("Label Week 1")).toBeInTheDocument();
    expect(document.querySelector(".ui-chart-tooltip.custom-tooltip")).toBeInTheDocument();
    expect(screen.getByText("name:Velocity")).toBeInTheDocument();
    expect(screen.getByText("fmt:42")).toBeInTheDocument();
    expect(screen.queryByText("Nullish")).not.toBeInTheDocument();
    expect(screen.queryByText("Hidden")).not.toBeInTheDocument();

    const swatch = document.querySelector(".ui-chart-tooltip__swatch");
    expect(swatch).toHaveStyle("--ui-chart-tooltip-swatch: #333");
  });

  it("supports entry-level formatter, default value/name fallbacks, and filterNull=false", () => {
    render(
      <ChartTooltipContent
        active
        label="Week 2"
        filterNull={false}
        payload={[
          {
            dataKey: "custom",
            name: "",
            value: "",
            fill: "#444",
            formatter: () => ["custom-value", ""],
          },
          {
            dataKey: "fallback",
            name: null,
            value: null,
          },
        ]}
      />
    );

    expect(screen.getByText("custom-value")).toBeInTheDocument();
    expect(screen.getAllByText("Value")).toHaveLength(2);
    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("can scope tooltip rows to a preferred entry and cap rendered items", () => {
    render(
      <ChartTooltipContent
        active
        preferredEntryName="Active"
        maxItems={1}
        payload={[
          {
            dataKey: "value",
            name: "Active",
            value: 56,
            payload: { name: "Active" },
          },
          {
            dataKey: "value",
            name: "Low activity",
            value: 1,
            payload: { name: "Low activity" },
          },
        ]}
      />
    );

    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.queryByText("Low activity")).not.toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
  });
});
