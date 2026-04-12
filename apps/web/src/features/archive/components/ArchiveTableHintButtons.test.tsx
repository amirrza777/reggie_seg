import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ArchiveRowInfoHintIcon, ArchiveStatusStack } from "./ArchiveTableHintButtons";

describe("ArchiveRowInfoHintIcon", () => {
  it("exposes the hint as an accessible control", () => {
    render(<ArchiveRowInfoHintIcon label="Help copy" />);
    expect(screen.getByRole("button", { name: "Help copy" })).toHaveAttribute("title", "Help copy");
  });
});

describe("ArchiveStatusStack", () => {
  it("renders active and archived variants", () => {
    const { rerender } = render(
      <ArchiveStatusStack variant="active" label="Active" archivedAt={null} />,
    );
    expect(screen.getByText("Active")).toBeInTheDocument();

    rerender(<ArchiveStatusStack variant="archived" label="Archived" archivedAt="2026-03-01" />);
    expect(screen.getByText("Archived")).toBeInTheDocument();
  });
});
