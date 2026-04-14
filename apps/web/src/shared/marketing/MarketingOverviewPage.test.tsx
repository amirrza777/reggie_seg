import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { MarketingOverviewPage, type MarketingOverviewPageContent } from "./MarketingOverviewPage";

vi.mock("next/link", () => ({
  default: ({ href, className, children, ...rest }: { href: string; className?: string; children: ReactNode }) => (
    <a href={href} className={className} {...rest}>
      {children}
    </a>
  ),
}));

const page: MarketingOverviewPageContent = {
  slug: "product",
  eyebrow: "Built for teams",
  title: "Plan projects with clarity",
  description: "Coordinate goals, milestones, and outcomes in one place.",
  primaryCtaLabel: "Get started",
  primaryCtaHref: "/signup",
  sectionTitle: "Everything you need",
  sectionDescription: "Move from setup to delivery without context switching.",
  cards: [
    {
      title: "Team spaces",
      description: "Organize collaboration by module and team.",
      href: "/product/spaces",
      linkLabel: "Explore spaces",
    },
    {
      title: "Progress tracking",
      description: "Monitor activity, deadlines, and blockers.",
      href: "/product/progress",
      linkLabel: "Explore progress",
    },
  ],
  bottomCtaTitle: "Ship better work together",
  bottomCtaDescription: "Keep every stakeholder aligned with shared project context.",
  bottomCtaLabel: "Book a demo",
  bottomCtaHref: "/demo",
};

describe("MarketingOverviewPage", () => {
  it("renders hero, section cards, and bottom CTA links", () => {
    const { container } = render(<MarketingOverviewPage page={page} />);

    expect(screen.getByText(page.eyebrow)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: page.title })).toBeInTheDocument();
    expect(screen.getByText(page.description)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: page.primaryCtaLabel })).toHaveAttribute("href", page.primaryCtaHref);

    expect(screen.getByRole("heading", { name: page.sectionTitle })).toBeInTheDocument();
    expect(screen.getByText(page.sectionDescription)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Explore spaces" })).toHaveAttribute("href", "/product/spaces");
    expect(screen.getByRole("link", { name: "Explore progress" })).toHaveAttribute("href", "/product/progress");
    expect(container.querySelectorAll(".footer-link-page__card")).toHaveLength(2);

    expect(screen.getByRole("heading", { name: page.bottomCtaTitle })).toBeInTheDocument();
    expect(screen.getByText(page.bottomCtaDescription)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: page.bottomCtaLabel })).toHaveAttribute("href", page.bottomCtaHref);
  });
});

