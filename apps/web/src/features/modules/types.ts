export type Module = {
  id: string;
  code?: string;
  title: string;
  description?: string;
  briefText?: string;
  timelineText?: string;
  expectationsText?: string;
  readinessNotesText?: string;
  leaderCount?: number;
  teachingAssistantCount?: number;
  createdAt?: string;
  archivedAt?: string | null;
  projectWindowStart?: string | null;
  projectWindowEnd?: string | null;
  teamCount?: number;
  projectCount?: number;
  /** Distinct staff with module access (leads + TAs); staff module list only, when not compact. */
  staffWithAccessCount?: number;
  accountRole?: "OWNER" | "TEACHING_ASSISTANT" | "ENROLLED" | "ADMIN_ACCESS";
};

export type JoinModulePayload = {
  code: string;
};

export type JoinModuleResponse = {
  moduleId: number;
  moduleName: string;
  result: "joined" | "already_joined";
};
