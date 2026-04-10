export const DAY_MS = 24 * 60 * 60 * 1000;
export const PROJECT_NAME = "Team Health Warning Demo Project";
export const TEAM_NAME = "Team Health Warning Demo Team";
export const SE_MODULE_NAME_FRAGMENT = "Software Engineering Group Project";
export const SEEDED_MESSAGE_SUBJECT_PREFIX = "[Seed Team Health]";
export const DEV_ADMIN_EMAIL = "admin@kcl.ac.uk";

export const WARNING_CONFIG = {
  version: 1 as const,
  rules: [
    {
      key: "LOW_ATTENDANCE",
      enabled: true,
      severity: "HIGH" as const,
      params: {
        minPercent: 70,
        lookbackDays: 30,
      },
    },
    {
      key: "MEETING_FREQUENCY",
      enabled: true,
      severity: "MEDIUM" as const,
      params: {
        minPerWeek: 2,
        lookbackDays: 30,
      },
    },
    {
      key: "LOW_CONTRIBUTION_ACTIVITY",
      enabled: true,
      severity: "MEDIUM" as const,
      params: {
        minCommits: 6,
        lookbackDays: 14,
      },
    },
  ],
};
