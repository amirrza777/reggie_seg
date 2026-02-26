export type UUID = string;

export type Entity = {
  id: UUID;
  createdAt: string;
  updatedAt: string;
};

export * from "./questionnaires";
