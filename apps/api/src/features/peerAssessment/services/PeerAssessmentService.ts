import { Prisma } from '@prisma/client';
import { prisma } from '../../../shared/db.js';
import type { PeerAssessment , User} from '@prisma/client';


export class PeerAssessmentService {
  async createAssessment(data: Prisma.PeerAssessmentCreateInput): Promise<PeerAssessment> {
    return await prisma.peerAssessment.create({
      data: data,
    });
  }

  async getAssessmentsByStudent(reviewerId: number){
    return await prisma.peerAssessment.findMany({
      where: {
        reviewerUserId: reviewerId,
      },
      include: { 
        reviewee: {
          select: {
            firstName: true,
            lastName: true,
          },
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
        questionnaireTemplateId: true,
        templateId: true,
        updatedAt: true,
      },
    });
  }

  async getFeedbackById(feedbackId: number): Promise<PeerAssessment | null> {
    return await prisma.peerAssessment.findUnique({
      where: {
        id: feedbackId,
      },
    });
  }
}