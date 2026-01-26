export type Question = {
  id: string;
  prompt: string;
  type: "text" | "scale";
};

export type FeedbackSubmission = {
  projectId: string;
  answers: Record<string, string>;
};
