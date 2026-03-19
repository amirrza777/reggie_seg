export type Project = {
  id: string;
  name: string;
  summary?: string;
  moduleName?: string;
  moduleId?: number;
  teamCount?: number;
  questionnaireTemplateId: number;
  archivedAt?: string | null;
};

export type ProjectDeadline = {
  taskOpenDate: string | null;
  taskDueDate: string | null;
  taskDueDateMcf?: string | null;
  assessmentOpenDate: string | null;
  assessmentDueDate: string | null;
  assessmentDueDateMcf?: string | null;
  feedbackOpenDate: string | null;
  feedbackDueDate: string | null;
  feedbackDueDateMcf?: string | null;
  isOverridden: boolean;
  overrideScope?: "NONE" | "TEAM" | "STUDENT";
  deadlineProfile?: "STANDARD" | "MCF";
};

export type DeadlineFieldKey =
  | "taskOpenDate"
  | "taskDueDate"
  | "assessmentOpenDate"
  | "assessmentDueDate"
  | "feedbackOpenDate"
  | "feedbackDueDate";

export type DeadlineInputMode = "SHIFT_DAYS" | "SELECT_DATE";

export type StaffTeamDeadlineDetails = {
  baseDeadline: ProjectDeadline;
  effectiveDeadline: ProjectDeadline;
  deadlineInputMode: DeadlineInputMode | null;
  shiftDays: Partial<Record<DeadlineFieldKey, number>> | null;
};

export type User = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  githubAccount?: { id: number } | null;
};

export type Team = {
  id: number;
  teamName: string;
  projectId: number;
  allocationLifecycle?: "DRAFT" | "ACTIVE";
  createdAt: string;
  inactivityFlag: "NONE" | "YELLOW" | "RED";
  deadlineProfile?: "STANDARD" | "MCF";
  hasDeadlineOverride?: boolean;
  allocations: Array<{
    userId: number;
    user: User;
  }>;
};

export type TeamHealthMessage = {
  id: number;
  projectId: number;
  teamId: number;
  requesterUserId: number;
  reviewedByUserId: number | null;
  subject: string;
  details: string;
  responseText: string | null;
  resolved: boolean;
  createdAt: string;
  updatedAt: string;
  reviewedAt: string | null;
  requester: User;
  reviewedBy:
    | {
        id: number;
        firstName: string;
        lastName: string;
        email: string;
      }
    | null;
};

export type StaffProject = {
  id: number;
  name: string;
  moduleId: number;
  moduleName: string;
  teamCount: number;
  hasGithubRepo: boolean;
  daysOld: number;
  membersTotal: number;
  membersConnected: number;
};

export type StaffProjectTeamsResponse = {
  project: {
    id: number;
    name: string;
    moduleId: number;
    moduleName: string;
  };
  teams: Team[];
};

export type StaffStudentDeadlineOverride = {
  id: number;
  userId: number;
  taskOpenDate: string | null;
  taskDueDate: string | null;
  assessmentOpenDate: string | null;
  assessmentDueDate: string | null;
  feedbackOpenDate: string | null;
  feedbackDueDate: string | null;
  reason: string | null;
  updatedAt: string;
};

export type StaffStudentDeadlineOverridePayload = {
  taskOpenDate?: string | null;
  taskDueDate?: string | null;
  assessmentOpenDate?: string | null;
  assessmentDueDate?: string | null;
  feedbackOpenDate?: string | null;
  feedbackDueDate?: string | null;
  reason?: string | null;
};

export type CreateStaffProjectPayload = {
  name: string;
  moduleId: number;
  questionnaireTemplateId: number;
  deadline: {
    taskOpenDate: string;
    taskDueDate: string;
    taskDueDateMcf: string;
    assessmentOpenDate: string;
    assessmentDueDate: string;
    assessmentDueDateMcf: string;
    feedbackOpenDate: string;
    feedbackDueDate: string;
    feedbackDueDateMcf: string;
  };
};

export type CreatedStaffProject = {
  id: number;
  name: string;
  moduleId: number;
  questionnaireTemplateId: number;
  deadline?: {
    taskOpenDate: string;
    taskDueDate: string;
    taskDueDateMcf: string;
    assessmentOpenDate: string;
    assessmentDueDate: string;
    assessmentDueDateMcf: string;
    feedbackOpenDate: string;
    feedbackDueDate: string;
    feedbackDueDateMcf: string;
  } | null;
};

export type StaffMarkingSummary = {
  mark: number | null;
  formativeFeedback: string | null;
  updatedAt: string;
  marker: {
    id: number;
    firstName: string;
    lastName: string;
  };
};

export type ProjectMarkingSummary = {
  teamId: number;
  teamMarking: StaffMarkingSummary | null;
  studentMarking: StaffMarkingSummary | null;
};

export type ProjectOverviewDashboardProps = {
  project: Project;
  deadline: ProjectDeadline;
  team: Team;
  marking: ProjectMarkingSummary | null;
};

export type DeadlineItem = {
  label: string;
  value: string | null;
  group: string;
};
