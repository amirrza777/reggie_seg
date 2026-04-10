import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CustomAllocationWaitingBoard } from "./CustomAllocationWaitingBoard";

describe("CustomAllocationWaitingBoard", () => {
  it("renders the staff-managed heading and instructions", () => {
    render(<CustomAllocationWaitingBoard projectId={5} />);
    expect(screen.getByText("Team allocation is managed by staff")).toBeInTheDocument();
    expect(screen.getByText(/Complete the allocation questionnaire/i)).toBeInTheDocument();
  });

  it("links to the project team page for a numeric projectId", () => {
    render(<CustomAllocationWaitingBoard projectId={7} />);
    expect(screen.getByRole("link", { name: /go to team page/i })).toHaveAttribute(
      "href",
      "/projects/7/team",
    );
  });

  it("links to the project team page for a string projectId", () => {
    render(<CustomAllocationWaitingBoard projectId="abc-42" />);
    expect(screen.getByRole("link", { name: /go to team page/i })).toHaveAttribute(
      "href",
      "/projects/abc-42/team",
    );
  });
});