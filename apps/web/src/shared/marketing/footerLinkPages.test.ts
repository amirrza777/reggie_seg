import { describe, expect, it } from "vitest";
import { getFooterLinkPage, listFooterLinkParams } from "./footerLinkPages";

describe("footerLinkPages", () => {
  it("lists all footer-link params", () => {
    const params = listFooterLinkParams();

    expect(params.length).toBe(12);
    expect(params).toContainEqual({ category: "product", slug: "peer-assessment" });
    expect(params).toContainEqual({ category: "resources", slug: "faq" });
    expect(params).toContainEqual({ category: "integrations", slug: "trello" });
  });

  it("returns page content for known slugs and null for unknown slugs", () => {
    const page = getFooterLinkPage("product", "analytics");

    expect(page).not.toBeNull();
    expect(page?.title).toMatch(/analytics/i);
    expect(page?.points).toHaveLength(3);
    expect(getFooterLinkPage("integrations", "unknown")).toBeNull();
  });

  it("resolves every listed param back to a page", () => {
    for (const { category, slug } of listFooterLinkParams()) {
      const page = getFooterLinkPage(category, slug);
      expect(page).not.toBeNull();
      expect(page?.slug).toBe(slug);
      expect(page?.primaryCtaHref).toMatch(/^\//);
    }
  });
});
