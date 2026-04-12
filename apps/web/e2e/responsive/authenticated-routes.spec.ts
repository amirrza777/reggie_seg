import { expect, test } from "@playwright/test";

const AUTH_MATRIX_ENABLED = process.env.PLAYWRIGHT_AUTH_TESTS === "1";
const RAW_API_BASE_URL = process.env.PLAYWRIGHT_API_BASE_URL ?? "http://localhost:3000";
const RAW_APP_BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3002";

type RoleKey = "student" | "staff" | "enterpriseAdmin" | "admin";

type RoleScenario = {
  role: RoleKey;
  email: string;
  password: string;
  routes: string[];
};

type AuthResponse = {
  accessToken?: string;
};
type CachedAccessToken = {
  token: string;
  expiresAtMs: number | null;
};

type LayoutMetrics = {
  bodyTextLength: number;
  hasVisibleStructure: boolean;
  horizontalOverflowPx: number;
  scrollWidth: number;
  viewportWidth: number;
};

const sharedPassword = process.env.PLAYWRIGHT_AUTH_PASSWORD ?? process.env.SEED_USER_PASSWORD ?? "password123";
const roleAccessTokenCache = new Map<RoleKey, CachedAccessToken>();
const roleClientIpSeed: Record<RoleKey, number> = {
  student: 31,
  staff: 71,
  enterpriseAdmin: 111,
  admin: 151,
};
const runClientIpOffset = Math.floor(Date.now() / 1000) % 200;

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

function decodeTokenExpiryMs(token: string): number | null {
  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }
  try {
    const payloadBase64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = payloadBase64.padEnd(Math.ceil(payloadBase64.length / 4) * 4, "=");
    const payload = JSON.parse(Buffer.from(padded, "base64").toString("utf8")) as { exp?: unknown };
    return typeof payload.exp === "number" && Number.isFinite(payload.exp) ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

function isCachedTokenUsable(cacheEntry: CachedAccessToken) {
  if (cacheEntry.expiresAtMs === null) {
    return true;
  }
  return Date.now() + 60_000 < cacheEntry.expiresAtMs;
}

const API_BASE_URL = normalizeLocalUrl(RAW_API_BASE_URL);
const APP_BASE_URL = normalizeLocalUrl(RAW_APP_BASE_URL);

function getClientIp(role: RoleKey, attempt: number): string {
  const octet = ((roleClientIpSeed[role] + runClientIpOffset + attempt * 17) % 250) + 1;
  return `203.0.113.${octet}`;
}

async function wait(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

const ROLE_SCENARIOS: RoleScenario[] = [
  {
    role: "student",
    email: process.env.PLAYWRIGHT_STUDENT_EMAIL ?? "student.assessment@example.com",
    password: process.env.PLAYWRIGHT_STUDENT_PASSWORD ?? sharedPassword,
    routes: ["/dashboard", "/calendar", "/projects", "/modules", "/profile"],
  },
  {
    role: "staff",
    email: process.env.PLAYWRIGHT_STAFF_EMAIL ?? "staff.assessment@example.com",
    password: process.env.PLAYWRIGHT_STAFF_PASSWORD ?? sharedPassword,
    routes: ["/staff/dashboard", "/staff/modules", "/staff/projects", "/staff/analytics", "/staff/marks", "/staff/repos"],
  },
  {
    role: "enterpriseAdmin",
    email: process.env.PLAYWRIGHT_ENTERPRISE_EMAIL ?? "entp_admin.assessment@example.com",
    password: process.env.PLAYWRIGHT_ENTERPRISE_PASSWORD ?? sharedPassword,
    routes: ["/enterprise", "/enterprise/users", "/enterprise/modules", "/enterprise/feature-flags", "/enterprise/groups", "/enterprise/forum-reports"],
  },
  {
    role: "admin",
    email: process.env.PLAYWRIGHT_ADMIN_EMAIL ?? "global_admin.assessment@example.com",
    password: process.env.PLAYWRIGHT_ADMIN_PASSWORD ?? sharedPassword,
    routes: ["/admin"],
  },
];

async function authenticateViaApi(options: {
  role: RoleKey;
  email: string;
  password: string;
  page: Parameters<Parameters<typeof test>[1]>[0]["page"];
  request: Parameters<Parameters<typeof test>[1]>[0]["request"];
}) {
  const accessToken = await getRoleAccessToken({
    role: options.role,
    email: options.email,
    password: options.password,
    request: options.request,
  });

  await options.page.context().addCookies([
    {
      name: "tf_access_token",
      value: accessToken,
      url: APP_BASE_URL,
    },
  ]);

  await options.page.addInitScript((token: string) => {
    window.localStorage.setItem("tf_access_token", token);
    document.cookie = `tf_access_token=${token}; path=/; SameSite=Lax`;
  }, accessToken);
}

async function getRoleAccessToken(options: {
  role: RoleKey;
  email: string;
  password: string;
  request: Parameters<Parameters<typeof test>[1]>[0]["request"];
}): Promise<string> {
  const cached = roleAccessTokenCache.get(options.role);
  if (cached && isCachedTokenUsable(cached)) {
    return cached.token;
  }

  const maxAttempts = 8;
  let lastStatus = 0;
  let lastBody = "";

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const clientIp = getClientIp(options.role, attempt);
    let response: Awaited<ReturnType<typeof options.request.post>>;
    try {
      response = await options.request.post(`${API_BASE_URL}/auth/login`, {
        headers: {
          "x-forwarded-for": clientIp,
          "x-real-ip": clientIp,
        },
        data: {
          email: options.email,
          password: options.password,
        },
      });
    } catch (error) {
      lastStatus = 0;
      lastBody = error instanceof Error ? error.message : String(error);
      if (attempt < maxAttempts) {
        await wait(350 * attempt);
        continue;
      }
      break;
    }

    const text = await response.text();
    lastStatus = response.status();
    lastBody = text;

    let payload: AuthResponse = {};
    try {
      payload = JSON.parse(text) as AuthResponse;
    } catch {
      payload = {};
    }

    if (response.ok() && payload.accessToken) {
      roleAccessTokenCache.set(options.role, {
        token: payload.accessToken,
        expiresAtMs: decodeTokenExpiryMs(payload.accessToken),
      });
      return payload.accessToken;
    }

    if ((response.status() === 429 || response.status() >= 500) && attempt < maxAttempts) {
      await wait(350 * attempt);
      continue;
    }

    break;
  }

  expect(
    false,
    `[${options.role}] login failed for ${options.email} after ${maxAttempts} attempts (status=${lastStatus}). Body: ${lastBody.slice(0, 260)}`
  ).toBeTruthy();

  return "";
}

test.describe("responsive authenticated role-route guardrails", () => {
  test.skip(
    !AUTH_MATRIX_ENABLED,
    "Set PLAYWRIGHT_AUTH_TESTS=1 to run authenticated responsive matrix checks."
  );

  for (const scenario of ROLE_SCENARIOS) {
    test.describe(`${scenario.role} routes`, () => {
      for (const route of scenario.routes) {
        test(`${route} stays visible with no horizontal overflow`, async ({ page, request }) => {
          await authenticateViaApi({
            role: scenario.role,
            email: scenario.email,
            password: scenario.password,
            page,
            request,
          });

          const pageErrors: string[] = [];
          const failedRequests: string[] = [];

          page.on("pageerror", (error) => {
            pageErrors.push(error.message);
          });

          page.on("requestfailed", (requestEntry) => {
            const type = requestEntry.resourceType();
            if (type === "document" || type === "script" || type === "stylesheet") {
              failedRequests.push(
                `${type}: ${requestEntry.url()} (${requestEntry.failure()?.errorText ?? "failed"})`
              );
            }
          });

          const response = await page.goto(route, { waitUntil: "networkidle" });
          expect(response?.status() ?? 0).toBeLessThan(500);

          await page.waitForTimeout(250);

          const resolvedPathname = new URL(page.url()).pathname;
          expect(
            resolvedPathname,
            `[${scenario.role}] Route resolved to login for ${route} on ${test.info().project.name}.`
          ).not.toBe("/login");

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
            const hasVisibleStructure = Boolean(
              body?.querySelector("main, [role='main'], h1, h2, h3, p, button, a, input, select, textarea, table")
            );

            return {
              bodyTextLength: visibleText.length,
              hasVisibleStructure,
              horizontalOverflowPx: Math.max(0, scrollWidth - viewportWidth),
              scrollWidth,
              viewportWidth,
            };
          });

          expect(
            metrics.bodyTextLength > 24 || metrics.hasVisibleStructure,
            `[${scenario.role}] Page appears empty on ${route} (${test.info().project.name}); text=${metrics.bodyTextLength}, structure=${metrics.hasVisibleStructure}.`
          ).toBeTruthy();

          expect(
            metrics.horizontalOverflowPx,
            `[${scenario.role}] Horizontal overflow on ${route} (${test.info().project.name}): ${metrics.horizontalOverflowPx}px; scrollWidth=${metrics.scrollWidth}, viewport=${metrics.viewportWidth}.`
          ).toBeLessThanOrEqual(2);

          expect(
            pageErrors,
            `[${scenario.role}] Runtime errors on ${route} (${test.info().project.name}): ${pageErrors.join(" | ")}`
          ).toEqual([]);

          expect(
            failedRequests.length,
            `[${scenario.role}] Request failures on ${route} (${test.info().project.name}): ${failedRequests.slice(0, 4).join(" | ")}`
          ).toBeLessThan(3);
        });
      }
    });
  }
});
