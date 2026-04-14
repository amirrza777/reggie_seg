import { prisma } from "../../../shared/db.js";

export async function getStaffViewerModuleAccessLabel(userId: number, userRole: string, moduleId: number) {
  if (userRole === "ADMIN" || userRole === "ENTERPRISE_ADMIN") {
    return "Admin access";
  }

  const [lead, ta] = await Promise.all([
    prisma.moduleLead.findUnique({
      where: { moduleId_userId: { moduleId, userId } },
      select: { userId: true },
    }),
    prisma.moduleTeachingAssistant.findUnique({
      where: { moduleId_userId: { moduleId, userId } },
      select: { userId: true },
    }),
  ]);

  if (lead) {
    return "Module lead";
  }
  if (ta) {
    return "Teaching assistant";
  }
  return "Staff access";
}
