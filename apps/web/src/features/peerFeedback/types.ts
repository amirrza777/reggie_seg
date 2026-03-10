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
  questionId?: string;
  order: number;
  question: string;
  answer: string | number | boolean | null;
  type?: "text" | "multiple-choice" | "rating" | "slider";
  configs?: {
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
};

export type PeerFeedback = {
  id: string;
  projectId?: string;
  reviewerId: string;
  revieweeId: string;
  submittedAt: string;
  answers: Answer[];
  templateId?: number;
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

export type PeerFeedbackReview = {
  reviewText?: string | null;
  agreementsJson?: AgreementsMap | null;
};

export const AGREEMENT_OPTIONS: { label: AgreementOption; score: number }[] = [
  { label: 'Strongly Disagree', score: 1 },
  { label: 'Disagree', score: 2 },
  { label: 'Reasonable', score: 3 },
  { label: 'Agree', score: 4 },
  { label: 'Strongly Agree', score: 5 },
];
