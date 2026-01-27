import { PrismaClient, PeerAssessment, Prisma } from '@prisma/client';
const prisma = new PrismaClient();

export class PeerAssessmentService {
  async createAssessment(data: Prisma.PeerAssessmentCreateInput): Promise<PeerAssessment> {
    return await prisma.peerAssessment.create({
      data: data,
    });
  }

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

  async getFeedbackForStudent(revieweeId: number): Promise<PeerAssessment[]> {
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
}