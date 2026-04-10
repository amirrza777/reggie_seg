import { prisma } from "../../shared/db.js";

export async function getModuleLeadsForProject(projectId: number) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { moduleId: true },
  });

  if (!project) {
    return [];
  }

  return prisma.moduleLead.findMany({
    where: { moduleId: project.moduleId },
    select: { userId: true },
  });
}
