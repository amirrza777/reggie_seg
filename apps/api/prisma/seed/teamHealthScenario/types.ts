export type TeamHealthMessageRow = {
  projectId: number;
  teamId: number;
  requesterUserId: number;
  subject: string;
  details: string;
  resolved: boolean;
  responseText: string | null;
  reviewedByUserId: number | null;
  createdAt: Date;
  updatedAt: Date;
  reviewedAt: Date | null;
};

export type ExistingScenarioSeed = { seeded: true; projectId: number; teamId: number } | { seeded: false };
