import { PrismaClient, Prisma } from '@prisma/client';
import type { ModuleSummary } from "../staff/types.js";

const prisma = new PrismaClient();

export class StaffPeerAssessmentService {
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

  //TODO: surely this is ok nesting right?
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

  async getNumStudentsInModule(moduleId: number): Promise<number> {
    return await prisma.userModule.count({
      where: {
        moduleId: moduleId,
      },
    });
  }

  async getNumSubmittedPAsForModule(moduleId: number): Promise<number> {
    return await prisma.peerAssessment.count({
      where: {
        moduleId: moduleId,
      },
    });
  }

  async getProgressForMyModules(staffId: number): Promise<ModuleSummary[]> {
    const modules = await this.getMyModules(staffId);
    
    const summaries = await Promise.all(
      modules.map(async (module) => {
        const submitted = await this.getNumSubmittedPAsForModule(module.id);
        const all = await this.getNumStudentsInModule(module.id);
        const expected = all * (all-1);
        
        return {
          id: module.id,
          title: module.name,
          submitted,
          expected,
        };
      })
    );
    
    return summaries;
  }

  async getTeamsInModule(moduleId: number): Promise<Team[]> {
    const assessments = await prisma.peerAssessment.findMany({
      where: { moduleId },
      select: { teamId: true },
      distinct: ['teamId'],
    });
    
    return await prisma.team.findMany({
      where: { id: { in: assessments.map(a => a.teamId) } },
    });
  }

  async getNumStudentsInTeam(teamId: number): Promise<number> {
    return await prisma.teamAllocation.count({
      where: {
        teamId: teamId,
      },
    });
  }

  async getNumSubmittedPAsForTeam(teamId: number): Promise<number> {
    return await prisma.peerAssessment.count({
      where: {
        teamId: teamId,
      },
    });
  }

  async getProgressForMyTeams(moduleId: number): Promise<ModuleSummary[]> {
    const teams = await this.getTeamsInModule(moduleId);
    
    const summaries = await Promise.all(
      teams.map(async (team) => {
        const submitted = await this.getNumSubmittedPAsForTeam(team.id);
        const all = await this.getNumStudentsInTeam(team.id);
        const expected = all * (all - 1);
        
        return {
          id: team.id,
          title: team.teamName,
          submitted,
          expected,
        };
      })
    );
    
    return summaries;
  }

}