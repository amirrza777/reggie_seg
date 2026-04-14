import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { getMarketingOverviewPage } from "@/shared/marketing/marketingOverviewPages";
import AboutOverviewPage, { metadata as aboutMetadata } from "./about/page";
import FaqOverviewPage, { metadata as faqMetadata } from "./faq/page";
import FeaturesOverviewPage, { metadata as featuresMetadata } from "./features/page";
import ProductOverviewPage, { metadata as productMetadata } from "./product/page";
import ResourcesOverviewPage, { metadata as resourcesMetadata } from "./resources/page";

vi.mock("@/shared/marketing/MarketingOverviewPage", () => ({
  MarketingOverviewPage: ({ page }: { page: { slug: string; title: string } }) => (
    <main data-testid={`overview-page-${page.slug}`}>{page.title}</main>
  ),
}));

describe("marketing overview route pages", () => {
  it.each([
    {
      slug: "about" as const,
      title: "About — Team Feedback",
      metadata: aboutMetadata,
      Component: AboutOverviewPage,
    },
    {
      slug: "faq" as const,
      title: "FAQ — Team Feedback",
      metadata: faqMetadata,
      Component: FaqOverviewPage,
    },
    {
      slug: "features" as const,
      title: "Features — Team Feedback",
      metadata: featuresMetadata,
      Component: FeaturesOverviewPage,
    },
    {
      slug: "product" as const,
      title: "Product — Team Feedback",
      metadata: productMetadata,
      Component: ProductOverviewPage,
    },
    {
      slug: "resources" as const,
      title: "Resources — Team Feedback",
      metadata: resourcesMetadata,
      Component: ResourcesOverviewPage,
    },
  ])("exports metadata and renders the route component for $slug", ({ slug, title, metadata, Component }) => {
    const page = getMarketingOverviewPage(slug);

    expect(metadata).toEqual({
      title,
      description: page.description,
    });

    render(<Component />);
    expect(screen.getByTestId(`overview-page-${slug}`)).toHaveTextContent(page.title);
  });
});
