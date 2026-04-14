import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HelpNavGate } from "./HelpNavGate";

vi.mock("./HelpNav", () => ({
  HelpNav: () => <nav data-testid="help-nav" />,
}));

describe("HelpNavGate", () => {
  it("renders HelpNav", () => {
    render(<HelpNavGate />);
    expect(screen.getByTestId("help-nav")).toBeInTheDocument();
  });
});
