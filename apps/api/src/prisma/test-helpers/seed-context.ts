import type { Role } from "@prisma/client";
import type { SeedContext, SeedUsersByRole, SeedUser } from "../../../prisma/seed/types";

function makeUser(id: number, role: Role, email: string): SeedUser {
  return { id, role, email };
}

function defaultUsersByRole(): SeedUsersByRole {
  return {
    adminOrStaff: [makeUser(900, "STAFF", "staff@example.com")],
    students: [makeUser(101, "STUDENT", "student1@example.com"), makeUser(102, "STUDENT", "student2@example.com")],
  };
}

export function makeSeedContext(overrides: Partial<SeedContext> = {}): SeedContext {
  const base: SeedContext = {
    enterprise: { id: "ent-1", code: "ENT", name: "Enterprise" },
    passwordHash: "hashed",
    users: [],
    standardUsers: [],
    assessmentAccounts: [],
    usersByRole: defaultUsersByRole(),
    modules: [{ id: 11 }],
    templates: [{ id: 21, questionLabels: ["Q1"] }],
    projects: [{ id: 31, moduleId: 11, templateId: 21 }],
    teams: [{ id: 41, projectId: 31 }],
  };
  return { ...base, ...overrides };
}
