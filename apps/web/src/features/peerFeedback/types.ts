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
  order: number;
  question: string;
  answer: string | number;
};

export type PeerFeedback = {
  id: string;
  projectId?: string;
  reviewerId: string;
  revieweeId: string;
  submittedAt: string;
  answers: Answer[];
  firstName?: string;
  lastName?: string;
  reviewSubmitted?: boolean;
}
export type AgreementOption = 'Strongly Disagree' | 'Disagree' | 'Reasonable' | 'Agree' | 'Strongly Agree';

export type AgreementValue = {
  selected: AgreementOption;
  score: number;
};

export type AgreementsMap = Record<string, AgreementValue>;

export type PeerAssessmentReviewPayload = {
  reviewText?: string;
  agreements: AgreementsMap;
};

export const AGREEMENT_OPTIONS: { label: AgreementOption; score: number }[] = [
  { label: 'Strongly Disagree', score: 1 },
  { label: 'Disagree', score: 2 },
  { label: 'Reasonable', score: 3 },
  { label: 'Agree', score: 4 },
  { label: 'Strongly Agree', score: 5 },
];
