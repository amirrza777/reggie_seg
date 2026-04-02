export type QuestionType = "text" | "multiple-choice" | "rating" | "slider";

export const QUESTIONNAIRE_PURPOSE_VALUES = [
  "PEER_ASSESSMENT",
  "CUSTOMISED_ALLOCATION",
  "GENERAL_PURPOSE",
] as const;

export type QuestionnairePurpose = (typeof QUESTIONNAIRE_PURPOSE_VALUES)[number];

export type BaseConfigs = {
  required?: boolean;
  helperText?: string;
};

export type TextConfigs = BaseConfigs & {
  placeholder?: string;
  minLength?: number;
  maxLength?: number;
};

export type MultipleChoiceConfigs = BaseConfigs & {
  options: string[];
};

export type RatingConfigs = BaseConfigs & {
  min: number;
  max: number;
};

export type SliderConfigs = BaseConfigs & {
  min: number;
  max: number;
  step?: number;
  left?: string;
  right?: string;
};

export type QuestionConfigs =
  | TextConfigs
  | MultipleChoiceConfigs
  | RatingConfigs
  | SliderConfigs;

export type Question = {
  id: number;
  label: string;
  type: QuestionType;
  configs?: QuestionConfigs;
};

export type IncomingQuestion = Omit<Question, "id"> & {
  id?: number;
};

export type Questionnaire = {
  id: number;
  templateName: string;
  purpose: QuestionnairePurpose;
  createdAt: string;
  isPublic?: boolean;
  ownerId?: number;
  canEdit?: boolean;
  questions: Question[];
};