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
  order: Number;
  question: string;
  answer: string;
};

export type PeerFeedback = {
  id: string;
  projectId?: string;
  reviewerId: string;
  revieweeId: string;
  submittedAt: string;
  answers: Answer[];
}
