export const SEED_USER_PASSWORD = process.env.SEED_USER_PASSWORD || "password123";
export const ADMIN_BOOTSTRAP_EMAIL = process.env.ADMIN_BOOTSTRAP_EMAIL?.toLowerCase();
export const ADMIN_BOOTSTRAP_PASSWORD = process.env.ADMIN_BOOTSTRAP_PASSWORD;
export const SEED_GITHUB_STAFF_EMAIL = (process.env.SEED_GITHUB_STAFF_EMAIL || "github.staff@example.com").toLowerCase();
export const SEED_GITHUB_STAFF_PASSWORD = process.env.SEED_GITHUB_STAFF_PASSWORD || "password123";
export const SEED_GITHUB_STUDENT_EMAIL =
  (process.env.SEED_GITHUB_STUDENT_EMAIL || "github.student@example.com").toLowerCase();
export const SEED_GITHUB_STUDENT_PASSWORD = process.env.SEED_GITHUB_STUDENT_PASSWORD || "password123";
export const SEED_DATABASE_PROVIDER = (process.env.SEED_DATABASE_PROVIDER || process.env.DATABASE_PROVIDER || "mysql")
  .trim()
  .toLowerCase();

export type SeedProfileName = "dev" | "demo" | "e2e" | "trello-e2e";

export type SeedScenarioName =
  | "adminTeamAllocation"
  | "completedProject"
  | "githubDemo";

export type SeedProfileConfig = {
  name: SeedProfileName;
  fixtureJoinCodes: boolean;
  deterministicFixtures: boolean;
  scenarios: ReadonlySet<SeedScenarioName>;
};

function isEnabled(value: string | undefined, fallback: boolean) {
  if (value == null) return fallback;
  return !["0", "false", "no", "off"].includes(value.trim().toLowerCase());
}

export const SEED_PROFILE = ((process.env.SEED_PROFILE || "dev").trim().toLowerCase() || "dev") as SeedProfileName;

const BASE_PROFILE_CONFIGS: Record<SeedProfileName, SeedProfileConfig> = {
  dev: {
    name: "dev",
    fixtureJoinCodes: false,
    deterministicFixtures: false,
    scenarios: new Set(["completedProject", "githubDemo"]),
  },
  demo: {
    name: "demo",
    fixtureJoinCodes: true,
    deterministicFixtures: true,
    scenarios: new Set(["adminTeamAllocation", "completedProject", "githubDemo"]),
  },
  e2e: {
    name: "e2e",
    fixtureJoinCodes: true,
    deterministicFixtures: true,
    scenarios: new Set(["githubDemo"]),
  },
  "trello-e2e": {
    name: "trello-e2e",
    fixtureJoinCodes: true,
    deterministicFixtures: true,
    scenarios: new Set(["adminTeamAllocation", "githubDemo"]),
  },
};

function resolveSeedProfileConfig(): SeedProfileConfig {
  const base = BASE_PROFILE_CONFIGS[SEED_PROFILE] ?? BASE_PROFILE_CONFIGS.dev;
  const scenarios = new Set(base.scenarios);

  if (isEnabled(process.env.SEED_COMPLETED_PROJECT_SCENARIO, scenarios.has("completedProject"))) {
    scenarios.add("completedProject");
  } else {
    scenarios.delete("completedProject");
  }

  return {
    ...base,
    scenarios,
  };
}

export const SEED_CONFIG = resolveSeedProfileConfig();
