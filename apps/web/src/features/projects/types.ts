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
  assessmentOpenDate: string | null;
  assessmentDueDate: string | null;
  feedbackOpenDate: string | null;
  feedbackDueDate: string | null;
  isOverridden: boolean;
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
  inactivityFlag: "NONE" | "YELLOW" | "RED";
  allocations: Array<{
    userId: number;
    user: User;
  }>;
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

export type DiscussionPost = {
  id: number;
  title: string;
  body: string;
  createdAt: string;
  author: {
    id: number;
    firstName: string;
    lastName: string;
  };
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
