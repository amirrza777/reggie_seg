export type IncomingQuestion = {
  id?: number;
  text: string;
  type: string;
  configs?: unknown;
};

export type Question = {
  id: number;
  label: string;
  type: string;
  order: number;
  configs?: unknown;
};