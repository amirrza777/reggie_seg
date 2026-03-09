import type { Role } from "@prisma/client";

export type SeedUser = { id: number; role: Role };
export type SeedModule = { id: number };
export type SeedTemplate = { id: number };
export type SeedProject = { id: number };
export type SeedTeam = { id: number; projectId: number };
