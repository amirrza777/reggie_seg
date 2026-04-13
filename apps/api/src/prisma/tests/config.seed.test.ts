import { afterEach, describe, expect, it, vi } from "vitest";

const ENV_KEYS = [
  "SEED_USER_PASSWORD",
  "ADMIN_BOOTSTRAP_EMAIL",
  "ADMIN_BOOTSTRAP_PASSWORD",
  "SEED_GITHUB_STAFF_EMAIL",
  "SEED_GITHUB_STAFF_PASSWORD",
  "SEED_GITHUB_STUDENT_EMAIL",
  "SEED_GITHUB_STUDENT_PASSWORD",
  "SEED_DATABASE_PROVIDER",
  "DATABASE_PROVIDER",
  "SEED_PROFILE",
  "SEED_STUDENT_MARK_MIN",
  "SEED_STUDENT_MARK_MAX",
  "SEED_STUDENT_MARK_COVERAGE",
  "SEED_COMPLETED_PROJECT_SCENARIO",
  "SEED_STUDENT_MARK_SCENARIO",
] as const;

const ORIGINAL_ENV = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));

async function loadConfig(overrides: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>> = {}) {
  for (const key of ENV_KEYS) {
    const value = overrides[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  vi.resetModules();
  return import("../../../prisma/seed/config");
}

afterEach(() => {
  for (const key of ENV_KEYS) {
    const value = ORIGINAL_ENV[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  vi.resetModules();
});

describe("seed config", () => {
  it("uses defaults and normalizes casing", async () => {
    const config = await loadConfig();

    expect(config.SEED_USER_PASSWORD).toBe("password123");
    expect(config.ADMIN_BOOTSTRAP_EMAIL).toBeUndefined();
    expect(config.SEED_GITHUB_STAFF_EMAIL).toBe("github.staff@example.com");
    expect(config.SEED_GITHUB_STUDENT_EMAIL).toBe("github.student@example.com");
    expect(config.SEED_DATABASE_PROVIDER).toBe("mysql");
    expect(config.SEED_PROFILE).toBe("dev");
    expect(config.SEED_CONFIG.scenarios.has("completedProject")).toBe(true);
    expect(config.SEED_CONFIG.scenarios.has("staffStudentMarks")).toBe(true);
  });

  it("supports env overrides and toggles scenarios off with disabled flags", async () => {
    const config = await loadConfig({
      SEED_USER_PASSWORD: "custom-pass",
      ADMIN_BOOTSTRAP_EMAIL: "Admin@Example.com",
      SEED_GITHUB_STAFF_EMAIL: "STAFF@Example.com",
      SEED_GITHUB_STUDENT_EMAIL: "STUDENT@Example.com",
      DATABASE_PROVIDER: " PostgreSQL ",
      SEED_PROFILE: "demo",
      SEED_COMPLETED_PROJECT_SCENARIO: "off",
      SEED_STUDENT_MARK_SCENARIO: "false",
      SEED_STUDENT_MARK_COVERAGE: "2.5",
      SEED_STUDENT_MARK_MIN: "10",
      SEED_STUDENT_MARK_MAX: "99",
    });

    expect(config.SEED_USER_PASSWORD).toBe("custom-pass");
    expect(config.ADMIN_BOOTSTRAP_EMAIL).toBe("admin@example.com");
    expect(config.SEED_GITHUB_STAFF_EMAIL).toBe("staff@example.com");
    expect(config.SEED_GITHUB_STUDENT_EMAIL).toBe("student@example.com");
    expect(config.SEED_DATABASE_PROVIDER).toBe("postgresql");
    expect(config.SEED_PROFILE).toBe("demo");
    expect(config.SEED_STUDENT_MARK_COVERAGE).toBe(1);
    expect(config.SEED_STUDENT_MARK_MIN).toBe(10);
    expect(config.SEED_STUDENT_MARK_MAX).toBe(99);
    expect(config.SEED_CONFIG.scenarios.has("completedProject")).toBe(false);
    expect(config.SEED_CONFIG.scenarios.has("staffStudentMarks")).toBe(false);
    expect(config.SEED_CONFIG.scenarios.has("adminTeamAllocation")).toBe(true);
  });

  it("falls back safely for unknown profile and invalid numeric env values", async () => {
    const config = await loadConfig({
      SEED_PROFILE: "unknown-profile",
      SEED_STUDENT_MARK_MIN: "not-a-number",
      SEED_STUDENT_MARK_MAX: "NaN",
      SEED_STUDENT_MARK_COVERAGE: "-10",
      SEED_COMPLETED_PROJECT_SCENARIO: "yes",
      SEED_STUDENT_MARK_SCENARIO: "1",
    });

    expect(config.SEED_PROFILE).toBe("unknown-profile");
    expect(config.SEED_STUDENT_MARK_MIN).toBeGreaterThan(10);
    expect(config.SEED_STUDENT_MARK_MAX).toBeGreaterThan(config.SEED_STUDENT_MARK_MIN);
    expect(config.SEED_STUDENT_MARK_COVERAGE).toBe(0);
    expect(config.SEED_CONFIG.name).toBe("dev");
    expect(config.SEED_CONFIG.scenarios.has("completedProject")).toBe(true);
    expect(config.SEED_CONFIG.scenarios.has("staffStudentMarks")).toBe(true);
  });

  it("falls back to dev when SEED_PROFILE is blank after trimming", async () => {
    const config = await loadConfig({
      SEED_PROFILE: "   ",
    });

    expect(config.SEED_PROFILE).toBe("dev");
    expect(config.SEED_CONFIG.name).toBe("dev");
  });
});
