import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { notFound } from "next/navigation";
import { getFooterLinkPage, listFooterLinkParams } from "@/shared/marketing/footerLinkPages";
import FooterDetailPage, { generateMetadata, generateStaticParams } from "./page";

class NotFoundSentinel extends Error {}

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new NotFoundSentinel();
  }),
}));

vi.mock("@/shared/marketing/footerLinkPages", () => ({
  getFooterLinkPage: vi.fn(),
  listFooterLinkParams: vi.fn(),
}));

vi.mock("@/shared/marketing/FooterLinkDescriptionPage", () => ({
  FooterLinkDescriptionPage: ({
    category,
    page,
  }: {
    category: string;
    page: { slug: string; label: string };
  }) => (
    <section data-testid="footer-detail" data-category={category} data-slug={page.slug}>
      {page.label}
    </section>
  ),
}));

const notFoundMock = vi.mocked(notFound);
const listFooterLinkParamsMock = vi.mocked(listFooterLinkParams);
const getFooterLinkPageMock = vi.mocked(getFooterLinkPage);

describe("FooterDetailPage route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listFooterLinkParamsMock.mockReturnValue([
      { category: "product", slug: "overview" },
      { category: "resources", slug: "guides" },
    ]);
  });

  it("returns static params from footer page listings", () => {
    expect(generateStaticParams()).toEqual([
      { category: "product", slug: "overview" },
      { category: "resources", slug: "guides" },
    ]);
    expect(listFooterLinkParamsMock).toHaveBeenCalledTimes(1);
  });

  it("returns empty metadata for invalid category and missing pages", async () => {
    expect(
      await generateMetadata({
        params: Promise.resolve({ category: "invalid", slug: "overview" }),
      }),
    ).toEqual({});

    getFooterLinkPageMock.mockReturnValueOnce(null);
    expect(
      await generateMetadata({
        params: Promise.resolve({ category: "product", slug: "missing" }),
      }),
    ).toEqual({});
  });

  it("builds metadata from the resolved footer page", async () => {
    getFooterLinkPageMock.mockReturnValueOnce({
      slug: "overview",
      label: "Overview",
      description: "Product overview page",
    });

    await expect(
      generateMetadata({
        params: Promise.resolve({ category: "product", slug: "overview" }),
      }),
    ).resolves.toEqual({
      title: "Overview — Team Feedback",
      description: "Product overview page",
    });

    expect(getFooterLinkPageMock).toHaveBeenCalledWith("product", "overview");
  });

  it("throws notFound for invalid categories and unknown slugs", async () => {
    await expect(
      FooterDetailPage({
        params: Promise.resolve({ category: "invalid", slug: "overview" }),
      }),
    ).rejects.toBeInstanceOf(NotFoundSentinel);

    getFooterLinkPageMock.mockReturnValueOnce(null);

    await expect(
      FooterDetailPage({
        params: Promise.resolve({ category: "resources", slug: "missing" }),
      }),
    ).rejects.toBeInstanceOf(NotFoundSentinel);

    expect(notFoundMock).toHaveBeenCalledTimes(2);
  });

  it("renders footer detail page for a valid category and slug", async () => {
    getFooterLinkPageMock.mockReturnValueOnce({
      slug: "overview",
      label: "Overview",
      description: "Product overview page",
    });

    const page = await FooterDetailPage({
      params: Promise.resolve({ category: "product", slug: "overview" }),
    });

    render(page as ReactNode);

    expect(getFooterLinkPageMock).toHaveBeenCalledWith("product", "overview");
    expect(screen.getByTestId("footer-detail")).toHaveAttribute("data-category", "product");
    expect(screen.getByTestId("footer-detail")).toHaveAttribute("data-slug", "overview");
    expect(screen.getByText("Overview")).toBeInTheDocument();
  });
});
