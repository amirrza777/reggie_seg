import type { Response } from "express";
import { prisma } from "./db.js";

export type ProjectAndModuleArchiveState = {
  archivedAt: Date | null;
  moduleArchivedAt: Date | null;
};

/** Blocks mutations when the project or its parent module is archived. */
export function assertProjectMutableForWrites(state: ProjectAndModuleArchiveState): void {
  if (state.archivedAt) {
    throw { code: "PROJECT_ARCHIVED" as const };
  }
  if (state.moduleArchivedAt) {
    throw { code: "MODULE_ARCHIVED" as const };
  }
}

export async function assertProjectMutableForWritesByProjectId(projectId: number): Promise<void> {
  const row = await prisma.project.findUnique({
    where: { id: projectId },
    select: { archivedAt: true, module: { select: { archivedAt: true } } },
  });
  if (!row) {
    throw { code: "PROJECT_NOT_FOUND" as const };
  }
  assertProjectMutableForWrites({
    archivedAt: row.archivedAt,
    moduleArchivedAt: row.module.archivedAt,
  });
}

/** For team-scoped routes: enforces project + parent module not archived. */
export async function assertProjectMutableForWritesByTeamId(teamId: number): Promise<void> {
  const row = await prisma.team.findUnique({
    where: { id: teamId },
    select: {
      project: {
        select: { archivedAt: true, module: { select: { archivedAt: true } } },
      },
    },
  });
  if (!row?.project) {
    throw { code: "TEAM_NOT_FOUND" as const };
  }
  assertProjectMutableForWrites({
    archivedAt: row.project.archivedAt,
    moduleArchivedAt: row.project.module.archivedAt,
  });
}

export function sendProjectOrModuleArchivedConflict(res: Response, error: unknown): boolean {
  const code = (error as { code?: string })?.code;
  if (code === "PROJECT_ARCHIVED") {
    res.status(409).json({ error: "Project is archived" });
    return true;
  }
  if (code === "MODULE_ARCHIVED") {
    res.status(409).json({
      error: "This module is archived; its projects and teams cannot be edited",
    });
    return true;
  }
  return false;
}
