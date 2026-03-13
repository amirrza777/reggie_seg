export type Project = {
  id: string;
  name: string;
  summary?: string;
  moduleName?: string;
  moduleId?: number;
  teamCount?: number;
  questionnaireTemplateId: number;
};

export type ProjectDeadline = {
  taskOpenDate: string | null;
  taskDueDate: string | null;
  assessmentOpenDate: string | null;
  assessmentDueDate: string | null;
  feedbackOpenDate: string | null;
  feedbackDueDate: string | null;
  isOverridden: boolean;
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
};

export type Team = {
  id: number;
  teamName: string;
  projectId: number;
  createdAt: string;
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

export type TeamMember = {
  id: string;
  name: string;
  role: string;
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

export type DeadlineState = {
  label: string;
  color: string;
};
