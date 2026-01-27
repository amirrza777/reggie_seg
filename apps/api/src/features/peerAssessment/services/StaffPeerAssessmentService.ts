import { PrismaClient, PeerAssessment, ModuleLead, Module, Prisma } from '@prisma/client';
const prisma = new PrismaClient();

export class PeerAssessmentService {
  async getAssessmentsByStudent(reviewerId: number): Promise<PeerAssessment[]> {
    return await prisma.peerAssessment.findMany({
      where: {
        reviewerUserId: reviewerId,
      },
      include: {
        reviewee: {
          select: { firstName: true, lastName: true }, 
        },
      },
    });
  }

  async getMyModules(staffId: number): Promise<Module[]> {
    return await prisma.module.findMany({
      where: {
        moduleLeads: {
          some: {
            userId: staffId,
          },
        },
      },
    });
  }

  /*

  async getMyModuleProgress(staffId: number): Promise<Modules[Id, name, numSubmitted, totalNumExpected]> {
    return await prisma.peerAssessment.findMany({
      where: {
        revieweeUserId: revieweeId,
      },
      select: {
        id: true,
        answersJson: true,
        submittedAt: true,

        moduleId: true,
        projectId: true,
        teamId: true,
        reviewerUserId: true, 
        revieweeUserId: true,
        templateId: true,
        updatedAt: true,
      } as any, 
    });
  }
    */
}