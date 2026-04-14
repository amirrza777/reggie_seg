import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { ProgressCardGrid } from "./ProgressCardGrid";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("ProgressCardGrid", () => {
  it("renders each progress card and maps href values", () => {
    const items = [
      { id: 11, title: "Team 11", submitted: 8, expected: 10 },
      { id: 12, title: "Team 12", submitted: 5, expected: 10 },
    ];

    render(
      <ProgressCardGrid
        items={items}
        getHref={(item) => (item.id ? `/staff/peer-assessments/module/${item.id}` : undefined)}
      />,
    );

    expect(screen.getByRole("heading", { level: 3, name: "Team 11" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Team 12" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Team 11/i })).toHaveAttribute(
      "href",
      "/staff/peer-assessments/module/11",
    );
    expect(screen.getByRole("link", { name: /Team 12/i })).toHaveAttribute(
      "href",
      "/staff/peer-assessments/module/12",
    );
  });

  it("renders cards without links when getHref is absent", () => {
    render(<ProgressCardGrid items={[{ id: 1, title: "Solo", submitted: 1, expected: 1 }]} />);

    expect(screen.getByRole("heading", { level: 3, name: "Solo" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Solo/i })).not.toBeInTheDocument();
  });
});
