import { render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
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

    expect(screen.getByRole("link", { name: "Peer Assessment" })).toHaveAttribute("href", "/product/peer-assessment");
    const privacyLinks = screen.getAllByRole("link", { name: "Privacy" });
    expect(privacyLinks.length).toBeGreaterThan(0);
    privacyLinks.forEach((link) => {
      expect(link).toHaveAttribute("href", "/privacy");
    });
    expect(screen.getByRole("link", { name: "Status" })).toHaveAttribute("href", "/status");

    const year = new Date().getFullYear();
    expect(screen.getByText(`© ${year} Team Feedback`)).toBeInTheDocument();
  });

  it("toggles column accordion state and icon on click", async () => {
    const user = userEvent.setup();
    const { container } = render(<Footer />);

    const productToggle = screen.getByRole("button", { name: /product/i });
    expect(productToggle).toHaveAttribute("aria-expanded", "false");
    expect(within(productToggle).getByText("+")).toBeInTheDocument();

    await user.click(productToggle);
    expect(productToggle).toHaveAttribute("aria-expanded", "true");
    expect(within(productToggle).getByText("−")).toBeInTheDocument();
    expect(container.querySelector(".footer__col--open")).toBeInTheDocument();

    await user.click(productToggle);
    expect(productToggle).toHaveAttribute("aria-expanded", "false");
  });
});
