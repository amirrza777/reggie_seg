import { expect, test } from "@playwright/test";

const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/help",
  "/help/faqs",
  "/help/getting-started",
  "/help/account-access",
  "/help/roles-permissions",
  "/help/support",
  "/status",
  "/privacy",
  "/terms",
  "/cookies",
];

type LayoutMetrics = {
  bodyTextLength: number;
  horizontalOverflowPx: number;
  scrollWidth: number;
  viewportWidth: number;
};

test.describe("responsive public-route guardrails", () => {
  for (const route of PUBLIC_ROUTES) {
    test(`${route} keeps content visible with no horizontal overflow`, async ({ page }) => {
      const pageErrors: string[] = [];
      const failedRequests: string[] = [];

      page.on("pageerror", (error) => {
        pageErrors.push(error.message);
      });

      page.on("requestfailed", (request) => {
        const type = request.resourceType();
        if (type === "document" || type === "script" || type === "stylesheet") {
          failedRequests.push(`${type}: ${request.url()} (${request.failure()?.errorText ?? "failed"})`);
        }
      });

      const response = await page.goto(route, { waitUntil: "networkidle" });
      expect(response?.status() ?? 0).toBeLessThan(500);

      await page.waitForTimeout(250);

      const metrics = await page.evaluate<LayoutMetrics>(() => {
        const html = document.documentElement;
        const body = document.body;
        const scrollWidth = Math.max(
          html?.scrollWidth ?? 0,
          body?.scrollWidth ?? 0,
          html?.offsetWidth ?? 0,
          body?.offsetWidth ?? 0
        );
        const viewportWidth = window.innerWidth;

        const visibleText = (body?.innerText ?? "").trim();

        return {
          bodyTextLength: visibleText.length,
          horizontalOverflowPx: Math.max(0, scrollWidth - viewportWidth),
          scrollWidth,
          viewportWidth,
        };
      });

      expect(
        metrics.bodyTextLength,
        `Page appears empty on ${route} (${test.info().project.name}).`
      ).toBeGreaterThan(40);

      expect(
        metrics.horizontalOverflowPx,
        `Horizontal overflow on ${route} (${test.info().project.name}): ${metrics.horizontalOverflowPx}px; scrollWidth=${metrics.scrollWidth}, viewport=${metrics.viewportWidth}.`
      ).toBeLessThanOrEqual(2);

      expect(
        pageErrors,
        `Runtime errors on ${route} (${test.info().project.name}): ${pageErrors.join(" | ")}`
      ).toEqual([]);

      expect(
        failedRequests.length,
        `Request failures on ${route} (${test.info().project.name}): ${failedRequests.slice(0, 4).join(" | ")}`
      ).toBeLessThan(3);
    });
  }
});
