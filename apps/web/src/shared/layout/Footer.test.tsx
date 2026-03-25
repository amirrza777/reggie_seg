import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { Footer } from "./Footer";

vi.mock("next/link", () => ({
  default: ({ href, children, className }: { href: string; children: ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

describe("Footer", () => {
  it("renders brand, columns, and legal/meta links", () => {
    render(<Footer />);

    expect(screen.getByText("Team Feedback")).toBeInTheDocument();
    expect(screen.getByText("Product")).toBeInTheDocument();
    expect(screen.getByText("Resources")).toBeInTheDocument();
    expect(screen.getAllByText("Integrations").length).toBeGreaterThan(0);
    expect(screen.getByText("Legal")).toBeInTheDocument();
    expect(screen.getByText("Admin")).toBeInTheDocument();

    expect(screen.getByRole("link", { name: "Peer assessment" })).toHaveAttribute("href", "/?section=product");
    const privacyLinks = screen.getAllByRole("link", { name: "Privacy" });
    expect(privacyLinks.length).toBeGreaterThan(0);
    privacyLinks.forEach((link) => {
      expect(link).toHaveAttribute("href", "/privacy");
    });
    expect(screen.getByRole("link", { name: "Status" })).toHaveAttribute("href", "/status");

    const year = new Date().getFullYear();
    expect(screen.getByText(`© ${year} Team Feedback`)).toBeInTheDocument();
  });
});
