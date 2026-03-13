export type Module = {
  id: string;
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
