import { prisma } from "../../shared/db.js";

export function findUserById(userId: number) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
}
