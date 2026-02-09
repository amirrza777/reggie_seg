type QuestionType = "text" | "multiple-choice" | "rating" | "slider";

type SliderConfigs = {
  min: number;
  max: number;
  step: number;
  left: string;
  right: string;
  helperText?: string;
};

type QuestionConfigs =
  | { options: string[] }              // multiple-choice
  | { min: number; max: number }        // rating
  | SliderConfigs                       // slider
  | {};                                 // text

type Question = {
  id: number;
  label: string;
  type: QuestionType;
  configs?: QuestionConfigs;
};
