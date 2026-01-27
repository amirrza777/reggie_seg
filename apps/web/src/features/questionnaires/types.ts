export type Questionnaire = {
  id: number;
  templateName: string;
  createdAt: string;
};

export type IncomingQuestion = {
  id?: number;
  text: string;
  type: string;
  configs?: unknown;
};
