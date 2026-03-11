import type { Role } from "@prisma/client";

export type SeedUser = { id: number; role: Role };
export type SeedModule = { id: number };
export type SeedTemplate = { id: number; questionLabels: string[] };
export type SeedProject = { id: number; templateId: number };
export type SeedTeam = { id: number; projectId: number };
