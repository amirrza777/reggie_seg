import type { Question } from "@shared/types/questionnaires";

export type {
  Questionnaire,
  QuestionType,
  BaseConfigs,
  TextConfigs,
  MultipleChoiceConfigs,
  RatingConfigs,
  SliderConfigs,
  QuestionConfigs,
  Question,
  IncomingQuestion,
} from "@shared/types/questionnaires";

export type EditableQuestion = Omit<Question, "id"> & {
  id?: number;
  dbId?: number;
  uiId: number;
};

export type Answer = {
  id: string;
  question: string;
  answer: string | number;
};
