export type Module = {
  id: string;
  code?: string;
  title: string;
  description?: string;
  briefText?: string;
  timelineText?: string;
  expectationsText?: string;
  readinessNotesText?: string;
  teamCount?: number;
  projectCount?: number;
  accountRole?: "OWNER" | "TEACHING_ASSISTANT" | "ENROLLED" | "ADMIN_ACCESS";
};

export type JoinModulePayload = {
  code: string;
};

export type JoinModuleResponse = {
  moduleId: number;
  moduleName: string;
  enrolled: true;
  alreadyEnrolled: boolean;
};
