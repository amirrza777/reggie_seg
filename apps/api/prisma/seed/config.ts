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
export const SEED_COMPLETED_PROJECT_SCENARIO = !["0", "false", "no", "off"].includes(
  (process.env.SEED_COMPLETED_PROJECT_SCENARIO ?? "true").trim().toLowerCase()
);
export const SEED_PROFILE = (process.env.SEED_PROFILE || "dev").trim().toLowerCase();
export const SEED_ENABLE_ADMIN_TEAM_ALLOCATION = ["trello-e2e", "demo"].includes(SEED_PROFILE);
export const SEED_FIXTURE_JOIN_CODES = ["demo", "e2e", "trello-e2e"].includes(SEED_PROFILE);
