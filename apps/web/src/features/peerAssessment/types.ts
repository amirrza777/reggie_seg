export type Teammate = {
  id: number;
  firstName: string;
  lastName: string;
};

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

export type Question = {
  id: number;
  text: string;
  type: "text" | "multiple-choice" | "rating";
  order: number;
  configs?: {
    options?: string[];
    min?: number;
    max?: number;
  };
};

export type PeerAssessmentData = {
  moduleId: number;
  projectId?: number;
  teamId: number;
  reviewerUserId: number;
  revieweeUserId: number;
  templateId: number;
  answersJson: Record<string, any>;
};

export type PeerAssessment = {
  id: string;
  moduleId: number;
  projectId?: number;
  teamId: number;
  reviewerUserId: number;
  revieweeUserId: number;
  submittedAt: string;
  templateId: number;
  answers: {
    id: string;
    order: number;
    question: string;
    answer: string;
  }[];
  firstName: string; 
  lastName: string; 
}