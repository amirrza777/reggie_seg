export type StaffUserRole = "STAFF" | "ENTERPRISE_ADMIN" | "ADMIN";
export type StaffScopedActorRole = StaffUserRole | "STUDENT";

export type StaffScopedProject = {
  id: number;
  name: string;
  moduleId: number;
  moduleName: string;
  archivedAt: Date | null;
  enterpriseId: string;
};

export type StaffScopedProjectAccess = StaffScopedProject & {
  actorRole: "STAFF" | "ENTERPRISE_ADMIN" | "ADMIN";
  isModuleLead: boolean;
  isModuleTeachingAssistant: boolean;
  canApproveAllocationDrafts: boolean;
};

export type ModuleStudent = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
};

export type ProjectTeamSummary = {
  id: number;
  teamName: string;
  memberCount: number;
};

export type ManualAllocationStudent = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  currentTeamId: number | null;
  currentTeamName: string | null;
};

export type AppliedRandomTeam = {
  id: number;
  teamName: string;
  memberCount: number;
};

export type AppliedManualTeam = {
  id: number;
  teamName: string;
  memberCount: number;
};

export type ProjectDraftTeam = {
  id: number;
  teamName: string;
  memberCount: number;
  createdAt: Date;
  updatedAt: Date;
  draftCreatedBy: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  members: Array<{
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  }>;
};

export type ProjectDraftTeamConflict = {
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  teamId: number;
  teamName: string;
};

export type ApprovedDraftTeam = {
  id: number;
  teamName: string;
  memberCount: number;
  members: Array<{
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  }>;
};

export type CustomAllocationTemplateQuestion = {
  id: number;
  label: string;
  type: string;
};

export type CustomAllocationTemplate = {
  id: number;
  templateName: string;
  ownerId: number;
  isPublic: boolean;
  questions: CustomAllocationTemplateQuestion[];
};

export type CustomAllocationLatestResponse = {
  reviewerUserId: number;
  answersJson: unknown;
};