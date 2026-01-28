export type Question = {
  id: string;
  prompt: string;
  type: "text" | "scale" | string;
  options?: string[];
};

export type FeedbackSubmission = {
  projectId: string;
  answers: Record<string, string>;
  anonymous?: boolean;
};

export type Answer = {
  id: string;
  question: string;
  answer: string | number;
};
