export type Project = {
  id: string;
  name: string;
  summary?: string;
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
  allocations: Array<{
    userId: number;
    user: User;
  }>;
};

export type TeamMember = {
  id: string;
  name: string;
  role: string;
};
