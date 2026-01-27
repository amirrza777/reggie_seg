// Types for peer assesment

export type Teammate = {
  id: number;
  firstName: string;
  lastName: string;
};

export type Question = {
  id: number;
  text: string;
  type: "text" | "multiple-choice" | "rating";
  order: number;
  configs?: {
    options?: string[];
    min?: number;
    max?: number;
  };
};
