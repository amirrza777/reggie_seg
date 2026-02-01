export type Questionnaire = {
  id: number;
  templateName: string;
  createdAt: string;
};

export type QuestionType = "text" | "multiple-choice" | "rating" | "slider";

export type BaseConfigs = {
  required?: boolean;
  helpText?: string;
};

export type TextConfigs = BaseConfigs & {
  minLength?: number;
  maxLength?: number;
  placeholder?: string;
};

export type MultipleChoiceConfigs = BaseConfigs & {
  options: string[];
  allowOther?: boolean;
  randomizeOptions?: boolean; // whether to randomize options order
  maxSelections?: number; // for multiple selection questions
};

export type RatingConfigs = BaseConfigs & {
  min: number; // allow professor to choose (e.g., 1)
  max: number; // allow professor to choose (e.g., 10)
};

export type SliderConfigs = BaseConfigs & {
  min: number;  // e.g. 0
  max: number;  // e.g. 100
  step?: number; // e.g. 1
  leftLabel?: string;  // "Strongly disagree"
  rightLabel?: string; // "Strongly agree"
};

export type QuestionConfigs =
  | TextConfigs
  | MultipleChoiceConfigs
  | RatingConfigs
  | SliderConfigs;

export type Question = {
  id: number;
  text: string;
  type: QuestionType;
  configs?: QuestionConfigs;
};