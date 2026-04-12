export type TeamInvite = {
  id: string;
  teamId: number;
  inviterId: number;
  inviteeEmail: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "CANCELLED" | "EXPIRED";
  active: boolean;
  createdAt: string;
  expiresAt: string;
  message: string | null;
  team?: { id: number; teamName: string; projectId: number };
  inviter?: { id: number; firstName: string; lastName: string; email: string };
};

export type TeamInviteEligibleStudent = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
};

export type RandomAllocationPreview = {
  project: {
    id: number;
    name: string;
    moduleId: number;
    moduleName: string;
  };
  studentCount: number;
  teamCount: number;
  existingTeams: Array<{
    id: number;
    teamName: string;
    memberCount: number;
  }>;
  previewTeams: Array<{
    index: number;
    suggestedName: string;
    members: Array<{
      id: number;
      firstName: string;
      lastName: string;
      email: string;
    }>;
  }>;
  unassignedStudents: Array<{
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  }>;
};

export type RandomAllocationApplied = {
  project: {
    id: number;
    name: string;
    moduleId: number;
    moduleName: string;
  };
  studentCount: number;
  teamCount: number;
  appliedTeams: Array<{
    id: number;
    teamName: string;
    memberCount: number;
  }>;
};

export type ManualAllocationStudentStatus = "AVAILABLE" | "ALREADY_IN_TEAM";

export type ManualAllocationWorkspace = {
  project: {
    id: number;
    name: string;
    moduleId: number;
    moduleName: string;
  };
  existingTeams: Array<{
    id: number;
    teamName: string;
    memberCount: number;
  }>;
  students: Array<{
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    status: ManualAllocationStudentStatus;
    currentTeam: {
      id: number;
      teamName: string;
    } | null;
  }>;
  counts: {
    totalStudents: number;
    availableStudents: number;
    alreadyInTeamStudents: number;
  };
};

export type ManualAllocationApplied = {
  project: {
    id: number;
    name: string;
    moduleId: number;
    moduleName: string;
  };
  team: {
    id: number;
    teamName: string;
    memberCount: number;
  };
};

export type AllocationDraftsWorkspace = {
  project: {
    id: number;
    name: string;
    moduleId: number;
    moduleName: string;
  };
  access: {
    actorRole: "STAFF" | "ENTERPRISE_ADMIN" | "ADMIN";
    isModuleLead: boolean;
    isModuleTeachingAssistant: boolean;
    canApproveAllocationDrafts: boolean;
  };
  drafts: Array<{
    id: number;
    teamName: string;
    memberCount: number;
    createdAt: string;
    updatedAt: string;
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
  }>;
};

export type AllocationDraftUpdated = {
  project: {
    id: number;
    name: string;
    moduleId: number;
    moduleName: string;
  };
  access: {
    actorRole: "STAFF" | "ENTERPRISE_ADMIN" | "ADMIN";
    isModuleLead: boolean;
    isModuleTeachingAssistant: boolean;
    canApproveAllocationDrafts: boolean;
  };
  draft: AllocationDraftsWorkspace["drafts"][number];
};

export type AllocationDraftApproved = {
  project: {
    id: number;
    name: string;
    moduleId: number;
    moduleName: string;
  };
  approvedTeam: {
    id: number;
    teamName: string;
    memberCount: number;
  };
};

export type AllocationDraftDeleted = {
  project: {
    id: number;
    name: string;
    moduleId: number;
    moduleName: string;
  };
  deletedDraft: {
    id: number;
    teamName: string;
  };
};

export type CustomAllocationQuestionType = "multiple-choice" | "rating" | "slider";
export type CustomAllocationCriteriaStrategy = "diversify" | "group" | "ignore";
export type CustomAllocationNonRespondentStrategy = "distribute_randomly" | "exclude";

export type CustomAllocationQuestionnaireListing = {
  project: {
    id: number;
    name: string;
    moduleId: number;
    moduleName: string;
  };
  questionnaires: Array<{
    id: number;
    templateName: string;
    ownerId: number;
    isPublic: boolean;
    eligibleQuestionCount: number;
    eligibleQuestions: Array<{
      id: number;
      label: string;
      type: CustomAllocationQuestionType;
    }>;
  }>;
};

export type CustomAllocationCoverage = {
  project: {
    id: number;
    name: string;
    moduleId: number;
    moduleName: string;
  };
  questionnaireTemplateId: number;
  totalAvailableStudents: number;
  respondingStudents: number;
  nonRespondingStudents: number;
  responseRate: number;
  responseThreshold: number;
};

export type CustomAllocationPreview = {
  project: {
    id: number;
    name: string;
    moduleId: number;
    moduleName: string;
  };
  questionnaireTemplateId: number;
  previewId: string;
  generatedAt: string;
  expiresAt: string;
  teamCount: number;
  respondentCount: number;
  nonRespondentCount: number;
  nonRespondentStrategy: CustomAllocationNonRespondentStrategy;
  criteriaSummary: Array<{
    questionId: number;
    strategy: Exclude<CustomAllocationCriteriaStrategy, "ignore">;
    weight: number;
    satisfactionScore: number;
  }>;
  teamCriteriaSummary: Array<{
    teamIndex: number;
    criteria: Array<{
      questionId: number;
      strategy: Exclude<CustomAllocationCriteriaStrategy, "ignore">;
      weight: number;
      responseCount: number;
      summary:
        | {
            kind: "none";
          }
        | {
            kind: "numeric";
            average: number;
            min: number;
            max: number;
          }
        | {
            kind: "categorical";
            categories: Array<{
              value: string;
              count: number;
            }>;
          };
    }>;
  }>;
  overallScore: number;
  previewTeams: Array<{
    index: number;
    suggestedName: string;
    members: Array<{
      id: number;
      firstName: string;
      lastName: string;
      email: string;
      responseStatus: "RESPONDED" | "NO_RESPONSE";
    }>;
  }>;
  unassignedStudents: Array<{
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    responseStatus: "RESPONDED" | "NO_RESPONSE";
  }>;
};

export type CustomAllocationApplied = {
  project: {
    id: number;
    name: string;
    moduleId: number;
    moduleName: string;
  };
  previewId: string;
  studentCount: number;
  teamCount: number;
  appliedTeams: Array<{
    id: number;
    teamName: string;
    memberCount: number;
  }>;
};
