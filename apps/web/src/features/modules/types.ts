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
  staffWithAccessCount?: number;
  accountRole?: "OWNER" | "TEACHING_ASSISTANT" | "ENROLLED" | "ADMIN_ACCESS";
};

export type ModuleStaffListMember = {
  userId: number;
  email: string;
  displayName: string;
  roles: Array<"LEAD" | "TA">;
};

export type ModuleStudentProjectMatrixProject = { id: number; name: string };

export type ModuleStudentProjectMatrixStudent = {
  userId: number;
  email: string;
  displayName: string;
  teamCells: Array<{ teamId: number; teamName: string } | null>;
};
