export type Teammate = {
  id: number;
  firstName: string;
  lastName: string;
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
