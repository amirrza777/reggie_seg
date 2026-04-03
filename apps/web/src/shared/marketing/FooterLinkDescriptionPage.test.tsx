import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { FooterLinkDescriptionPage } from "./FooterLinkDescriptionPage";
import { getFooterLinkPage } from "./footerLinkPages";

vi.mock("next/link", () => ({
  default: ({ href, children, className }: { href: string; children: ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

describe("FooterLinkDescriptionPage", () => {
  it("renders known CTA copy for a mapped page key", () => {
    const page = getFooterLinkPage("integrations", "github");
    if (!page) throw new Error("expected integrations/github page content");

    render(<FooterLinkDescriptionPage category="integrations" page={page} />);

    expect(screen.getByRole("heading", { level: 1, name: page.title })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: /bring github delivery signals into team review cycles/i,
      }),
    ).toBeInTheDocument();
    const ctaLinks = screen.getAllByRole("link", { name: page.primaryCtaLabel });
    expect(ctaLinks).toHaveLength(2);
    expect(ctaLinks[0]).toHaveAttribute("href", page.primaryCtaHref);
    expect(ctaLinks[1]).toHaveAttribute("href", page.primaryCtaHref);
  });

  it("falls back to generic CTA copy for unmapped keys", () => {
    const customPage = {
      slug: "new-capability",
      label: "New capability",
      title: "New capability content",
      description: "Description",
      points: [{ title: "Point A", body: "Body A" }],
      primaryCtaLabel: "Try now",
      primaryCtaHref: "/register",
    };

    render(<FooterLinkDescriptionPage category="product" page={customPage} />);

    expect(
      screen.getByRole("heading", {
        level: 2,
        name: /take new capability live across your next cohort/i,
      }),
    ).toBeInTheDocument();
    const ctaLinks = screen.getAllByRole("link", { name: "Try now" });
    expect(ctaLinks).toHaveLength(2);
    expect(ctaLinks[0]).toHaveAttribute("href", "/register");
    expect(ctaLinks[1]).toHaveAttribute("href", "/register");
  });
});
