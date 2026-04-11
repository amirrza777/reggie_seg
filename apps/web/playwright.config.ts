import { defineConfig, devices } from "@playwright/test";

const requestedBaseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3002";
const requestedApiBaseURL = process.env.PLAYWRIGHT_API_BASE_URL ?? "http://localhost:3000";
const requireApiServer = process.env.PLAYWRIGHT_REQUIRE_API === "1";

function isLocalHostname(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

function normalizeLocalUrl(url: string) {
  const parsed = new URL(url);
  if (parsed.protocol === "https:" && isLocalHostname(parsed.hostname)) {
    parsed.protocol = "http:";
  }
  return parsed.toString().replace(/\/$/, "");
}

const baseURL = normalizeLocalUrl(requestedBaseURL);
const apiBaseURL = normalizeLocalUrl(requestedApiBaseURL);
const parsedBaseUrl = new URL(baseURL);
const parsedApiBaseUrl = new URL(apiBaseURL);

const shouldStartWebServer = !process.env.PLAYWRIGHT_BASE_URL || isLocalHostname(new URL(requestedBaseURL).hostname);
const webServerPort = parsedBaseUrl.port ? Number.parseInt(parsedBaseUrl.port, 10) : 3002;

const shouldStartApiServer =
  requireApiServer &&
  (!process.env.PLAYWRIGHT_API_BASE_URL || isLocalHostname(new URL(requestedApiBaseURL).hostname));

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: [
    ...(shouldStartWebServer
      ? [{
        command: `npm run dev -- --port ${webServerPort}`,
        url: baseURL,
        reuseExistingServer: true,
        timeout: 180000,
      }]
      : []),
    ...(shouldStartApiServer
      ? [
        {
          command: "npm run dev",
          cwd: "../api",
          url: `${apiBaseURL.replace(/\/$/, "")}/health`,
          reuseExistingServer: true,
          timeout: 180000,
        },
      ]
      : []),
  ],
  projects: [
    {
      name: "desktop-1440x900",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: "tablet-1024x768",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1024, height: 768 },
      },
    },
    {
      name: "tablet-short-1024x600",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1024, height: 600 },
      },
    },
    {
      name: "mobile-390x844",
      use: {
        ...devices["Desktop Chrome"],
        browserName: "chromium",
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 3,
      },
    },
    {
      name: "mobile-320x568",
      use: {
        ...devices["Desktop Chrome"],
        browserName: "chromium",
        viewport: { width: 320, height: 568 },
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 2,
      },
    },
    {
      name: "landscape-short-844x390",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 844, height: 390 },
      },
    },
  ],
});
