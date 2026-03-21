import type { Question } from "@shared/types/questionnaires";

export type {
  Questionnaire,
  QuestionType,
  MultipleChoiceConfigs,
  RatingConfigs,
  SliderConfigs,
  QuestionConfigs,
  Question,
} from "@shared/types/questionnaires";

export type EditableQuestion = Omit<Question, "id"> & {
  id?: number;
  dbId?: number;
  uiId: number;
};
