import { prisma } from "../../../shared/db.js";

export type StaffScopeRole = "STUDENT" | "STAFF" | "ENTERPRISE_ADMIN" | "ADMIN";

export type ScopedStaffUser = {
  id: number;
  role: StaffScopeRole;
  enterpriseId: string;
};

export async function getScopedStaffUser(userId: number): Promise<ScopedStaffUser | null> {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, enterpriseId: true },
  });
}

export function isAdminScopedRole(role: StaffScopeRole): boolean {
  return role === "ADMIN" || role === "ENTERPRISE_ADMIN";
}
