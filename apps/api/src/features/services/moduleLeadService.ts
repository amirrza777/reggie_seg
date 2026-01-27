import { PrismaClient, User } from '@prisma/client';

const prisma = new PrismaClient();

type ModuleLead = Pick<User, 'id' | 'firstName' | 'lastName' | 'email'>;

export class ModuleLeadService {
  async getModuleLeadsByModule(moduleId: number): Promise<ModuleLead[]> {
    const rows = await prisma.moduleLead.findMany({
      where: { moduleId },
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
