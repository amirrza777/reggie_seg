export type Project = {
  id: string;
  name: string;
  informationText?: string | null;
  moduleName?: string;
  moduleId?: number;
  teamCount?: number;
  questionnaireTemplateId: number;
  teamAllocationQuestionnaireTemplateId?: number | null;
  archivedAt?: string | null;
  /** Set when the parent module is archived */
  moduleArchivedAt?: string | null;
  projectNavFlags?: ProjectNavFlagsConfig | null;
  taskOpenDate?: string | null;
};

export type ProjectNavFlagKey =
  | "team"
  | "meetings"
  | "peer_assessment"
  | "peer_feedback"
  | "repos"
  | "trello"
  | "discussion"
  | "team_health";

export type ProjectNavFlagsState = Record<ProjectNavFlagKey, boolean>;

export type ProjectNavPeerMode = "NATURAL" | "MANUAL";

export type ProjectNavPeerModes = {
  peer_assessment: ProjectNavPeerMode;
  peer_feedback: ProjectNavPeerMode;
};

export type ProjectNavFlagsConfig = {
  version: 1;
  active: ProjectNavFlagsState;
  completed: ProjectNavFlagsState;
  peerModes: ProjectNavPeerModes;
};

export type StaffProjectNavFlagsConfigResponse = {
  id: number;
  name: string;
  hasPersistedProjectNavFlags: boolean;
  projectNavFlags: ProjectNavFlagsConfig;
  deadlineWindow: {
    assessmentOpenDate: string | null;
    feedbackOpenDate: string | null;
  };
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
  teamAllocationQuestionnaireOpenDate?: string | null;
  teamAllocationQuestionnaireDueDate?: string | null;
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
  /** Present when the user has linked Trello (member id from Trello). */
  trelloMemberId?: string | null;
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
  trelloBoardId?: string | null;
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

export type TeamWarning = {
  id: number;
  projectId: number;
  teamId: number;
  type: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
  title: string;
  details: string;
  source: "AUTO" | "MANUAL";
  active: boolean;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
};

export type WarningRuleSeverity = "LOW" | "MEDIUM" | "HIGH";

export type ProjectWarningRuleConfig = {
  key: string;
  enabled: boolean;
  severity?: WarningRuleSeverity;
  ttlDays?: number;
  params?: Record<string, unknown>;
};

export type ProjectWarningsConfig = {
  version: 1;
  rules: ProjectWarningRuleConfig[];
};

export type StaffProjectWarningsConfigResponse = {
  id: number;
  hasPersistedWarningsConfig: boolean;
  warningsConfig: ProjectWarningsConfig;
};

export type StaffProject = {
  id: number;
  name: string;
  moduleId: number;
  moduleName: string;
  archivedAt: string | null;
  teamCount: number;
  hasGithubRepo: boolean;
  daysOld: number;
  membersTotal: number;
  membersConnected: number;
  dateRangeStart: string | null;
  dateRangeEnd: string | null;
  githubIntegrationPercent: number;
  trelloBoardsLinkedPercent: number;
  trelloBoardsLinkedCount: number;
  peerAssessmentsSubmittedPercent: number;
  peerAssessmentsSubmittedCount: number;
  peerAssessmentsExpectedCount: number;
};

export type StaffProjectTeamsResponse = {
  project: {
    id: number;
    name: string;
    moduleId: number;
    moduleName: string;
    moduleArchivedAt?: string | null;
    projectArchivedAt?: string | null;
    viewerAccessLabel?: string;
    canManageProjectSettings?: boolean;
    informationText?: string | null;
  };
  /** Students explicitly on this project (project access), used for allocation scope. */
  projectStudentCount: number;
  /** Of those, not yet on any active team for this project. */
  unassignedProjectStudentCount: number;
  teams: Team[];
};

export type StaffProjectManageDeadlineSnapshot = {
  taskOpenDate: string | null;
  taskDueDate: string | null;
  taskDueDateMcf: string | null;
  assessmentOpenDate: string | null;
  assessmentDueDate: string | null;
  assessmentDueDateMcf: string | null;
  feedbackOpenDate: string | null;
  feedbackDueDate: string | null;
  feedbackDueDateMcf: string | null;
  teamAllocationQuestionnaireOpenDate: string | null;
  teamAllocationQuestionnaireDueDate: string | null;
};

export type StaffProjectManageAccessPerson = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
};

export type StaffProjectManageAccessSnapshot = {
  moduleLeaders: StaffProjectManageAccessPerson[];
  moduleTeachingAssistants: StaffProjectManageAccessPerson[];
  moduleMemberDirectory: StaffProjectManageAccessPerson[];
  projectStudentIds: number[];
};

export type StaffProjectManageSummary = {
  id: number;
  name: string;
  archivedAt: string | null;
  moduleId: number;
  moduleArchivedAt: string | null;
  informationText: string | null;
  questionnaireTemplateId: number;
  questionnaireTemplate: { id: number; templateName: string } | null;
  projectDeadline: StaffProjectManageDeadlineSnapshot | null;
  hasSubmittedPeerAssessments: boolean;
  projectAccess: StaffProjectManageAccessSnapshot;
};

export type StaffProjectManageDeadlinePatchPayload = {
  taskOpenDate: string;
  taskDueDate: string;
  taskDueDateMcf: string;
  assessmentOpenDate: string;
  assessmentDueDate: string;
  assessmentDueDateMcf: string;
  feedbackOpenDate: string;
  feedbackDueDate: string;
  feedbackDueDateMcf: string;
  teamAllocationQuestionnaireOpenDate?: string | null;
  teamAllocationQuestionnaireDueDate?: string | null;
};

export type StaffProjectPeerAssessmentOverview = {
  project: { id: number; name: string };
  moduleId: number;
  questionnaireTemplate: { id: number; templateName: string } | null;
  teams: Array<{
    id: number;
    title: string;
    submitted: number;
    expected: number;
  }>;
  canManageProjectSettings: boolean;
  hasSubmittedPeerAssessments: boolean;
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
  teamAllocationQuestionnaireTemplateId?: number;
  informationText?: string | null;
  studentIds?: number[];
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
    teamAllocationQuestionnaireOpenDate?: string | null;
    teamAllocationQuestionnaireDueDate?: string | null;
  };
};

export type CreatedStaffProject = {
  id: number;
  name: string;
  moduleId: number;
  questionnaireTemplateId: number;
  teamAllocationQuestionnaireTemplateId?: number | null;
  informationText?: string | null;
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
    teamAllocationQuestionnaireOpenDate?: string | null;
    teamAllocationQuestionnaireDueDate?: string | null;
  } | null;
};

export type TeamAllocationQuestionnaireStatus = {
  questionnaireTemplate: {
    id: number;
    purpose: string;
    questions: Array<{
      id: number;
      label: string;
      type: string;
      order: number;
      configs: unknown;
    }>;
  };
  hasSubmitted: boolean;
  teamAllocationQuestionnaireOpenDate: string | null;
  teamAllocationQuestionnaireDueDate: string | null;
  windowIsOpen: boolean;
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
  team: Team | null;
  marking: ProjectMarkingSummary | null;
  view?: "overview" | "deadlines";
  teamFormationMode?: "self" | "custom" | "staff";
};

export type DeadlineItem = {
  label: string;
  value: string | null;
  group: string;
};
