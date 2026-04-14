import { Prisma } from "@prisma/client";
import type { PeerAssessment } from "@prisma/client";
import { prisma } from "../../../shared/db.js";
import { wherePeerAssessmentIsPeerReview } from "../peerAssessmentPurposeWhere.js";


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
        ...wherePeerAssessmentIsPeerReview,
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

  async getFeedbackForStudent(revieweeId: number){
    return await prisma.peerAssessment.findMany({
      where: {
        revieweeUserId: revieweeId,
        ...wherePeerAssessmentIsPeerReview,
      },
      select: {
        id: true,
        answersJson: true,
        submittedAt: true,
        projectId: true,
        teamId: true,
        reviewerUserId: true, 
        revieweeUserId: true,
        templateId: true,
        updatedAt: true,
        reviewee : {
          select: {
            firstName: true,
            lastName: true,
          } 
        }
      },
    });
  }

  async getFeedbackById(feedbackId: number): Promise<PeerAssessment | null> {
    return await prisma.peerAssessment.findUnique({
      where: {
        id: feedbackId,
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
}