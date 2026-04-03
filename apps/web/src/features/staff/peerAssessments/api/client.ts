import { apiFetch } from "@/shared/api/http";

export type ModuleSummary = {
  id?: number;
  title: string;
  submitted: number;
  expected: number;
  flagged?: boolean;
};

export type ModuleDetails = {
  module: { id: number; title: string; archivedAt: string | null };
  teams: ModuleSummary[];
};

export type StaffMarkingSummary = {
  mark: number | null;
  formativeFeedback: string | null;
  updatedAt: string;
  marker: {
    id: number;
    firstName: string;
    lastName: string;
  };
};

export async function getModulesSummary(staffId: number): Promise<ModuleSummary[]> {
  return apiFetch<ModuleSummary[]>(`/staff/peer-assessments/modules?staffId=${staffId}`, {
    cache: "no-store",
  });
}

export async function getModuleDetails(
  staffId: number,
  moduleId: number
): Promise<ModuleDetails> {
  return apiFetch<ModuleDetails>(
    `/staff/peer-assessments/module/${moduleId}?staffId=${staffId}`,
    { cache: "no-store" }
  );
}

export type TeamDetails = {
  module: { id: number; title: string; archivedAt: string | null };
  team: { id: number; title: string };
  students: ModuleSummary[];
  teamMarking: StaffMarkingSummary | null;
};

export async function getTeamDetails(
  staffId: number,
  moduleId: number,
  teamId: number
): Promise<TeamDetails> {
  return apiFetch<TeamDetails>(
    `/staff/peer-assessments/module/${moduleId}/team/${teamId}?staffId=${staffId}`,
    { cache: "no-store" }
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
  maxScore?: number;
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
  maxScore?: number;
};

export type StudentDetails = {
  module: { id: number; title: string; archivedAt: string | null };
  team: { id: number; title: string };
  student: { id: number; firstName: string; lastName: string };
  teamMembers: StudentTeamMember[];
  performanceSummary: PerformanceSummary;
  teamMarking: StaffMarkingSummary | null;
  studentMarking: StaffMarkingSummary | null;
};

export type StaffMarkingPayload = {
  mark: number | null;
  formativeFeedback: string | null;
};

export async function getStudentDetails(
  staffId: number,
  moduleId: number,
  teamId: number,
  studentId: number
): Promise<StudentDetails> {
  return apiFetch<StudentDetails>(
    `/staff/peer-assessments/module/${moduleId}/team/${teamId}/student/${studentId}?staffId=${staffId}`,
    { cache: "no-store" }
  );
}

export async function saveTeamMarking(
  staffId: number,
  moduleId: number,
  teamId: number,
  payload: StaffMarkingPayload
) {
  return apiFetch<StaffMarkingSummary>(
    `/staff/peer-assessments/module/${moduleId}/team/${teamId}/marking?staffId=${staffId}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    }
  );
}

export async function saveStudentMarking(
  staffId: number,
  moduleId: number,
  teamId: number,
  studentId: number,
  payload: StaffMarkingPayload
) {
  return apiFetch<StaffMarkingSummary>(
    `/staff/peer-assessments/module/${moduleId}/team/${teamId}/student/${studentId}/marking?staffId=${staffId}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    }
  );
}
