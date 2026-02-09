import { apiFetch } from "@/shared/api/http";

export type ModuleSummary = {
  id?: number;
  title: string;
  submitted: number;
  expected: number;
};

export type ModuleDetails = {
  module: { id: number; title: string };
  teams: ModuleSummary[];
};

export async function getModulesSummary(staffId: number): Promise<ModuleSummary[]> {
  return apiFetch<ModuleSummary[]>(`/staff/peer-assessments/modules?staffId=${staffId}`);
}

export async function getTeamSummary(moduleId: number): Promise<ModuleSummary[]> {
  return apiFetch<ModuleSummary[]>(`/staff/peer-assessments/teams?moduleId=${moduleId}`);
}

export async function getModuleDetails(
  staffId: number,
  moduleId: number
): Promise<ModuleDetails> {
  return apiFetch<ModuleDetails>(
    `/staff/peer-assessments/module/${moduleId}?staffId=${staffId}`
  );
}

export type TeamDetails = {
  module: { id: number; title: string };
  team: { id: number; title: string };
  students: ModuleSummary[];
};

export async function getTeamDetails(
  staffId: number,
  moduleId: number,
  teamId: number
): Promise<TeamDetails> {
  return apiFetch<TeamDetails>(
    `/staff/peer-assessments/module/${moduleId}/team/${teamId}?staffId=${staffId}`
  );
}

export type StudentTeamMember = {
  id: number;
  firstName: string;
  lastName: string;
  reviewedByCurrentStudent: boolean;
  reviewedCurrentStudent: boolean;
};

export type QuestionAverage = {
  questionId: number;
  questionText: string;
  averageScore: number;
  totalReviews: number;
  reviewerAnswers?: Array<{
    reviewerId: string;
    reviewerName: string;
    score: number;
    assessmentId?: string;
  }>;
};

export type PerformanceSummary = {
  overallAverage: number;
  totalReviews: number;
  questionAverages: QuestionAverage[];
};

export type StudentDetails = {
  module: { id: number; title: string };
  team: { id: number; title: string };
  student: { id: number; firstName: string; lastName: string };
  teamMembers: StudentTeamMember[];
  performanceSummary: PerformanceSummary;
};

export async function getStudentDetails(
  staffId: number,
  moduleId: number,
  teamId: number,
  studentId: number
): Promise<StudentDetails> {
  return apiFetch<StudentDetails>(
    `/staff/peer-assessments/module/${moduleId}/team/${teamId}/student/${studentId}?staffId=${staffId}`
  );
}
