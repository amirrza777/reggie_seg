import { cleanup, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: unknown }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/shared/layout/Header", () => ({
  Header: () => <div data-testid="marketing-header" />,
}));
vi.mock("@/shared/layout/Footer", () => ({
  Footer: () => <div data-testid="marketing-footer" />,
}));
vi.mock("@/shared/animation/HomeSectionScroll", () => ({
  HomeSectionScroll: () => <div data-testid="home-section-scroll" />,
}));
vi.mock("@/shared/animation/ScrollReveal", () => ({
  ScrollReveal: () => <div data-testid="scroll-reveal" />,
}));

import AuthLayout from "./(auth)/layout";
import HomePage from "./page";
import { MarketingLayout } from "./layouts/marketing";
import { AboutSection } from "./sections/marketing/AboutSection";
import { CtaSection } from "./sections/marketing/CtaSection";
import { FaqSection } from "./sections/marketing/FaqSection";
import { HealthSection } from "./sections/marketing/HealthSection";
import { HeroSection } from "./sections/marketing/HeroSection";
import { IntegrationsSection } from "./sections/marketing/IntegrationsSection";
import { ProductSection } from "./sections/marketing/ProductSection";
import { ShowcaseSection } from "./sections/marketing/ShowcaseSection";
import { TestimonialsSection } from "./sections/marketing/TestimonialsSection";
import { ToolkitSection } from "./sections/marketing/ToolkitSection";
import { TrustSection } from "./sections/marketing/TrustSection";
import * as marketingSectionExports from "./sections/marketing";

describe("auth layout", () => {
  it("renders shell with home logo link and children", () => {
    render(
      <AuthLayout>
        <div>Auth body</div>
      </AuthLayout>,
    );

    expect(screen.getByRole("link", { name: "Team Feedback" })).toHaveAttribute("href", "/");
    expect(screen.getByText("Auth body")).toBeInTheDocument();
  });
});

describe("marketing exports", () => {
  it("renders primary marketing sections", () => {
    const renderFresh = (node: JSX.Element) => {
      cleanup();
      render(node);
    };

    renderFresh(<HeroSection />);
    expect(screen.getByText("A platform built for group work.")).toBeInTheDocument();

    renderFresh(<ProductSection />);
    expect(screen.getByText("The feedback cycle that actually runs itself")).toBeInTheDocument();

    renderFresh(<ShowcaseSection />);
    expect(screen.getByText("Platform preview")).toBeInTheDocument();

    renderFresh(<TrustSection />);
    expect(screen.getByText("Trusted by teams, backed by moderators")).toBeInTheDocument();

    renderFresh(<ToolkitSection />);
    expect(screen.getAllByRole("link", { name: "Learn more" }).length).toBeGreaterThan(0);

    renderFresh(<AboutSection />);
    expect(screen.getByText("Your peer assessment, finally manageable")).toBeInTheDocument();

    renderFresh(<IntegrationsSection />);
    expect(screen.getByText("One platform, synced with the tools you already use")).toBeInTheDocument();

    renderFresh(<HealthSection />);
    expect(screen.getByText("Track team health and learning over time")).toBeInTheDocument();

    renderFresh(<TestimonialsSection />);
    expect(screen.getByText("The feedback system teams actually complete")).toBeInTheDocument();

    renderFresh(<FaqSection />);
    expect(screen.getByText("FAQs")).toBeInTheDocument();

    renderFresh(<CtaSection />);
    expect(screen.getByText("Run better group projects")).toBeInTheDocument();
  });

  it("renders faq section without optional link", () => {
    render(
      <FaqSection
        items={[{ question: "Q1?", answer: "A1" }]}
        reveal={false}
        leftAligned
        showMoreLink={false}
        subheading="Custom FAQ subtitle"
      />,
    );
    expect(screen.getByText("Custom FAQ subtitle")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "More FAQs" })).not.toBeInTheDocument();
  });

  it("renders marketing layout shell and homepage composition", () => {
    render(
      <MarketingLayout>
        <div>marketing body</div>
      </MarketingLayout>,
    );
    expect(screen.getByTestId("marketing-header")).toBeInTheDocument();
    expect(screen.getByTestId("home-section-scroll")).toBeInTheDocument();
    expect(screen.getByTestId("scroll-reveal")).toBeInTheDocument();
    expect(screen.getByTestId("marketing-footer")).toBeInTheDocument();
    expect(screen.getByText("marketing body")).toBeInTheDocument();

    render(<HomePage />);
    expect(screen.getByText("Team feedback platform")).toBeInTheDocument();
  });

  it("re-exports marketing sections via barrel", () => {
    expect(marketingSectionExports.HeroSection).toBeTypeOf("function");
    expect(marketingSectionExports.TrustSection).toBeTypeOf("function");
    expect(marketingSectionExports.CtaSection).toBeTypeOf("function");
  });
});
