import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const chartState = vi.hoisted(() => ({
  lastXAxisProps: null as null | {
    type: string;
    dataKey: string;
    domain: [number, number] | undefined;
    scale?: "linear";
    tickFormatter: (value: number) => string;
    padding: { left: number; right: number };
  },
}));

vi.mock("recharts", () => ({
  XAxis: (props: {
    type: string;
    dataKey: string;
    domain: [number, number] | undefined;
    scale?: "linear";
    tickFormatter: (value: number) => string;
    padding: { left: number; right: number };
  }) => {
    chartState.lastXAxisProps = props;
    return <div data-testid="x-axis" />;
  },
}));

vi.mock("@/shared/lib/formatDate", () => ({
  formatDate: vi.fn((value: string) => `formatted:${value}`),
}));

import {
  TrelloTimeXAxis,
  formatTrelloTimeTick,
  TrelloTimeXAxis as PrimaryAxis,
} from "./TrelloTimeXAxis";

describe("TrelloTimeXAxis", () => {
  it("formats tick values through shared date formatter", () => {
    const value = Date.UTC(2026, 2, 15);
    expect(formatTrelloTimeTick(value)).toBe("formatted:2026-03-15");
  });

  it("passes expected props to XAxis for the primary component", () => {
    render(<TrelloTimeXAxis domain={[1, 2]} scale="linear" />);

    expect(screen.getByTestId("x-axis")).toBeInTheDocument();
    expect(chartState.lastXAxisProps).toMatchObject({
      type: "number",
      dataKey: "time",
      domain: [1, 2],
      scale: "linear",
      padding: { left: 24, right: 24 },
    });
    expect(chartState.lastXAxisProps?.tickFormatter(0)).toBe("formatted:1970-01-01");
  });

  it("passes expected props when optional domain is omitted", () => {
    render(<PrimaryAxis domain={undefined} />);
    expect(screen.getByTestId("x-axis")).toBeInTheDocument();
    expect(chartState.lastXAxisProps?.domain).toBeUndefined();
    render(<PrimaryAxis domain={[100, 200]} />);
    expect(chartState.lastXAxisProps?.domain).toEqual([100, 200]);
  });
});
