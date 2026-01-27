export type Questionnaire = {
  id: number;
  templateName: string;
  createdAt: string;
};

export type QuestionType = "text" | "multiple-choice" | "rating";

export type Question = {
  id: number;
  text: string;
  type: QuestionType;
  configs?: {
    options?: string[];
    min?: number;
    max?: number;
  };
};