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
