export type TeamAllocation = {
  id: number;
  userId: number;
  teamId: number;
  user: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
};

export type QuestionType = "text" | "multiple-choice" | "rating" | "slider";

export type QuestionConfigs = {
  required?: boolean;
  helperText?: string;
  placeholder?: string;
  minLength?: number;
  maxLength?: number;
  options?: string[];
  min?: number;
  max?: number;
  step?: number;
  left?: string;
  right?: string;
};

export type Question = {
  id: number;
  text: string;
  type: QuestionType;
  order: number;
  configs?: QuestionConfigs;
};

export type PeerAssessmentData = {
  projectId: number;
  teamId: number;
  reviewerUserId: number;
  revieweeUserId: number;
  templateId: number;
  answersJson:
    | Record<string, string | number | boolean | null>
    | Array<{ question: string; answer: string | number | boolean | null }>;
};

export type PeerAssessment = {
  id: string;
  projectId: number;
  teamId: number;
  reviewerUserId: number;
  revieweeUserId: number;
  submittedAt: string;
  templateId: number;
  answers: Record<string, string | number | boolean | null>;
  templateQuestions: Question[];
  firstName: string;
  lastName: string;
};
