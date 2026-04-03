import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const chartState = vi.hoisted(() => ({
  referenceLineProps: null as
    | null
    | {
        x: number;
        stroke: string;
        strokeDasharray: string;
        label: (args: { viewBox?: { x?: number; y?: number } }) => JSX.Element;
      },
}));

vi.mock("recharts", () => ({
  ReferenceLine: (props: {
    x: number;
    stroke: string;
    strokeDasharray: string;
    label: (args: { viewBox?: { x?: number; y?: number } }) => JSX.Element;
  }) => {
    chartState.referenceLineProps = props;
    return <div data-testid="reference-line" />;
  },
}));

import { ProjectBoundaryReferenceLine } from "./ProjectBoundaryReferenceLine";

describe("ProjectBoundaryReferenceLine", () => {
  it("passes boundary styling props to ReferenceLine", () => {
    render(
      <ProjectBoundaryReferenceLine
        x={1710000000000}
        color="#16a34a"
        title="Project start"
        dateLabel="01 Mar 2026"
      />,
    );

    expect(screen.getByTestId("reference-line")).toBeInTheDocument();
    expect(chartState.referenceLineProps).toMatchObject({
      x: 1710000000000,
      stroke: "#16a34a",
      strokeDasharray: "4 4",
    });
  });

  it("renders multi-line labels using provided and fallback coordinates", () => {
    render(
      <ProjectBoundaryReferenceLine
        x={1}
        color="#2563eb"
        title="Deadline"
        dateLabel="15 Apr 2026"
      />,
    );

    const withViewBox = chartState.referenceLineProps?.label({ viewBox: { x: 100, y: 40 } });
    render(<svg>{withViewBox}</svg>);

    const label = screen.getByText("Deadline").closest("text");
    expect(label).toHaveAttribute("x", "100");
    expect(label).toHaveAttribute("y", "32");
    expect(screen.getByText("15 Apr 2026")).toBeInTheDocument();

    const withoutViewBox = chartState.referenceLineProps?.label({});
    render(<svg>{withoutViewBox}</svg>);

    const fallbackLabel = screen.getAllByText("Deadline")[1].closest("text");
    expect(fallbackLabel).toHaveAttribute("x", "0");
    expect(fallbackLabel).toHaveAttribute("y", "-8");
  });
});
