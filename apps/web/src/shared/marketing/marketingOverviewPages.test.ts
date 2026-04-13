import { describe, expect, it } from "vitest";
import { getMarketingOverviewPage, listMarketingOverviewSlugs } from "./marketingOverviewPages";

describe("marketingOverviewPages", () => {
  it("lists all top-nav overview slugs", () => {
    expect(listMarketingOverviewSlugs()).toEqual(["product", "features", "resources", "about", "faq"]);
  });

  it("returns populated content for each slug", () => {
    for (const slug of listMarketingOverviewSlugs()) {
      const page = getMarketingOverviewPage(slug);
      expect(page.slug).toBe(slug);
      expect(page.title.length).toBeGreaterThan(0);
      expect(page.description.length).toBeGreaterThan(0);
      expect(page.cards.length).toBeGreaterThan(0);
      for (const card of page.cards) {
        expect(card.href.startsWith("/")).toBe(true);
      }
    }
  });
});
