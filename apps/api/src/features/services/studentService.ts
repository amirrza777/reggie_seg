import { PrismaClient, User, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

type Student = Pick<User, 'id' | 'firstName' | 'lastName' | 'email'>;

export class UserService {
  async getStudentsByModule(moduleId: number): Promise<Student[]> {
    const rows = await prisma.userModule.findMany({
      where: {
        moduleId,
        user: { isStaff: false },
      },
      select: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return rows.map((row) => row.user);
  }

  async getStudentsByTeam(teamId: number): Promise<Student[]> {
    const rows = await prisma.teamAllocation.findMany({
      where: {
        teamId,
        user: { isStaff: false },
      },
      select: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return rows.map((row) => row.user);
  }
}
