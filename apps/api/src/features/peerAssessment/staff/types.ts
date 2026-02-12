export type ModuleSummary = {
  id?: number;
  title: string;
  submitted: number;
  expected: number;
};

export type ModuleDetailsResponse = {
  module: { id: number; title: string };
  teams: ModuleSummary[];
};

export type TeamDetailsResponse = {
  module: { id: number; title: string };
  team: { id: number; title: string };
  students: ModuleSummary[];
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
  reviewerAnswers?: ReviewerAnswer[];
};

export type PerformanceSummary = {
  overallAverage: number;
  totalReviews: number;
  questionAverages: QuestionAverage[];
};

export type StudentDetailsResponse = {
  module: { id: number; title: string };
  team: { id: number; title: string };
  student: { id: number; firstName: string; lastName: string };
  teamMembers: StudentTeamMember[];
  performanceSummary: PerformanceSummary;
};
