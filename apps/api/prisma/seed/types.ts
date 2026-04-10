import type { Role } from "@prisma/client";

export type SeedEnterprise = { id: string; code: string; name: string };
export type SeedUser = { id: number; role: Role; email: string; firstName?: string | null; lastName?: string | null };
export type SeedModule = { id: number };
export type SeedTemplate = { id: number; questionLabels: string[] };
export type SeedProject = { id: number; templateId: number; moduleId: number };
export type SeedTeam = { id: number; projectId: number };
export type SeedUsersByRole = {
  adminOrStaff: SeedUser[];
  students: SeedUser[];
};
export type SeedContext = {
  enterprise: SeedEnterprise;
  passwordHash: string;
  users: SeedUser[];
  standardUsers: SeedUser[];
  assessmentAccounts: SeedUser[];
  usersByRole: SeedUsersByRole;
  modules: SeedModule[];
  templates: SeedTemplate[];
  projects: SeedProject[];
  teams: SeedTeam[];
};
