import type { Question } from "@shared/types/questionnaires";

export type {
  Questionnaire,
  QuestionnairePurpose,
  QuestionType,
  MultipleChoiceConfigs,
  RatingConfigs,
  SliderConfigs,
  QuestionConfigs,
  Question,
} from "@shared/types/questionnaires";

export const QUESTIONNAIRE_PURPOSE_VALUES = [
  "PEER_ASSESSMENT",
  "CUSTOMISED_ALLOCATION",
  "GENERAL_PURPOSE",
] as const;

export type EditableQuestion = Omit<Question, "id"> & {
  id?: number;
  dbId?: number;
  uiId: number;
};