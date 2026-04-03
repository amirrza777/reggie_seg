export type ModuleSummary = {
  id?: number;
  title: string;
  submitted: number;
  expected: number;
  flagged?: boolean;
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

export type StaffModuleSummaryInResponse = {
  id: number;
  title: string;
  archivedAt: string | null;
};

export type ModuleDetailsResponse = {
  module: StaffModuleSummaryInResponse;
  teams: ModuleSummary[];
};

export type TeamDetailsResponse = {
  module: StaffModuleSummaryInResponse;
  team: { id: number; title: string };
  students: ModuleSummary[];
  teamMarking: StaffMarkingSummary | null;
};

export type StudentTeamMember = {
  id: number;
  firstName: string;
  lastName: string;
  reviewedByCurrentStudent: boolean;
  reviewedCurrentStudent: boolean;
};

export type ReviewerAnswer = {
  reviewerId: string;
  reviewerName: string;
  score: number;
  assessmentId?: string;
};

export type QuestionAverage = {
  questionId: number;
  questionText: string;
  averageScore: number;
  totalReviews: number;
  maxScore?: number;
  reviewerAnswers?: ReviewerAnswer[];
};

export type PerformanceSummary = {
  overallAverage: number;
  totalReviews: number;
  questionAverages: QuestionAverage[];
  maxScore?: number;
};

export type StudentDetailsResponse = {
  module: StaffModuleSummaryInResponse;
  team: { id: number; title: string };
  student: { id: number; firstName: string; lastName: string };
  teamMembers: StudentTeamMember[];
  performanceSummary: PerformanceSummary;
  teamMarking: StaffMarkingSummary | null;
  studentMarking: StaffMarkingSummary | null;
};

export type MarkingInput = {
  mark: number | null;
  formativeFeedback: string | null;
};