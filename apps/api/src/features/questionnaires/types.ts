type QuestionType = "text" | "multiple-choice" | "rating";

type Question = {
  id: number;
  text: string;
  type: QuestionType;
  configs?: {
    options?: string[];
    min?: number;
    max?: number;
  };
};