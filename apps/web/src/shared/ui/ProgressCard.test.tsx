import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { ProgressCard } from "./ProgressCard";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("ProgressCard", () => {
  it("renders clamped progress, fallback deadline, and flagged badge", () => {
    const { container } = render(
      <ProgressCard title="Peer Assessment" submitted={20} expected={10} flagged action={<button>Open</button>} />,
    );

    expect(screen.getByText("Not submitted")).toBeInTheDocument();
    expect(screen.getByText("Deadline not set")).toBeInTheDocument();
    expect(screen.getByText("20/10 assessments submitted")).toBeInTheDocument();
    expect(screen.getByText("100%")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open" })).toBeInTheDocument();

    const fill = container.querySelector(".progress-bar__fill") as HTMLElement;
    expect(fill.style.width).toBe("100%");
  });

  it("renders as a link wrapper when href is provided", () => {
    render(<ProgressCard title="Module" submitted={0} expected={0} href="/staff/modules/1" />);

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/staff/modules/1");
    expect(screen.getByText("0%")).toBeInTheDocument();
  });
});
