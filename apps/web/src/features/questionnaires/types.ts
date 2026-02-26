export type Questionnaire = {
  id: number;
  templateName: string;
  createdAt: string;
  isPublic?: boolean;
  ownerId?: number;
  canEdit?: boolean;
  questions: Question[];
};

export type QuestionType =
  | "text"
  | "multiple-choice"
  | "rating"
  | "slider";

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
  dbId?: number;
  label: string;
  type: QuestionType;
  configs?: QuestionConfigs;
};

export type EditableQuestion = Omit<Question, "id"> & {
  id?: number;
  uiId: number;
};


export type Answer = {
  id: string;
  question: string;
  answer: string | number;
};
