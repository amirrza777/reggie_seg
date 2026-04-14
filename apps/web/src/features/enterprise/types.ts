import type { UserRole } from "@/shared/auth/session";

export type EnterpriseModuleRecord = {
  id: number;
  code?: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string | null;
  studentCount: number;
  leaderCount: number;
  teachingAssistantCount: number;
  canManageAccess?: boolean;
  briefText?: string;
  timelineText?: string;
  expectationsText?: string;
  readinessNotesText?: string;
};

export type EnterpriseModuleCreateResponse = EnterpriseModuleRecord & {
  joinCode: string;
};

export type EnterpriseModuleJoinCodeResponse = {
  moduleId: number;
  joinCode: string;
};

export type EnterpriseFeatureFlag = {
  key: string;
  label: string;
  enabled: boolean;
};

export type EnterpriseModuleSearchParams = {
  q?: string;
  page?: number;
  pageSize?: number;
};

export type EnterpriseModuleSearchResponse = {
  items: EnterpriseModuleRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
  query: string | null;
};

export type EnterpriseManagedUser = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  isStaff: boolean;
  role: UserRole;
  active: boolean;
  membershipStatus: "active" | "inactive" | "left";
};

export type EnterpriseManagedUserRecord = Omit<EnterpriseManagedUser, "role" | "active" | "membershipStatus"> &
  Partial<Pick<EnterpriseManagedUser, "role" | "active" | "membershipStatus">>;

export type EnterpriseManagedUserUpdate = {
  role?: Extract<UserRole, "STUDENT" | "STAFF">;
  active?: boolean;
};

export type EnterpriseManagedUserCreate = {
  email: string;
  firstName?: string;
  lastName?: string;
  role?: Extract<UserRole, "STUDENT" | "STAFF" | "ENTERPRISE_ADMIN">;
};

export type EnterpriseUserSortBy = "name" | "joinDate";
export type EnterpriseUserSortDirection = "asc" | "desc";

export type EnterpriseUserSearchParams = {
  q?: string;
  sortBy?: EnterpriseUserSortBy;
  sortDirection?: EnterpriseUserSortDirection;
  page?: number;
  pageSize?: number;
};

export type EnterpriseUserSearchResponse = {
  items: EnterpriseManagedUserRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
  query: string | null;
};

export type EnterpriseAccessUserSearchScope = "staff" | "students" | "staff_and_students" | "all";

export type EnterpriseAccessUserSearchParams = {
  scope?: EnterpriseAccessUserSearchScope;
  q?: string;
  page?: number;
  pageSize?: number;
  excludeEnrolledInModule?: number;
  excludeOnModule?: "full" | "lead_ta";
  prioritiseUserIds?: number[];
};

export type EnterpriseAccessUserSearchResponse = {
  items: EnterpriseAssignableUser[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
  query: string | null;
  scope: EnterpriseAccessUserSearchScope;
};

export type EnterpriseOverview = {
  totals: {
    users: number;
    activeUsers: number;
    students: number;
    staff: number;
    enterpriseAdmins: number;
    modules: number;
    teams: number;
    meetings: number;
  };
  hygiene: {
    inactiveUsers: number;
    studentsWithoutModule: number;
    modulesWithoutStudents: number;
  };
  trends: {
    newUsers30d: number;
    newModules30d: number;
  };
};

export type EnterpriseModuleStudent = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  active: boolean;
  enrolled: boolean;
};

export type EnterpriseModuleStudentsResponse = {
  module: EnterpriseModuleRecord;
  students: EnterpriseModuleStudent[];
};

export type EnterpriseAssignableUser = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  active: boolean;
};

export type EnterpriseModuleAccessStaff = EnterpriseAssignableUser & {
  isLeader: boolean;
  isTeachingAssistant: boolean;
};

export type EnterpriseModuleAccessStudent = EnterpriseAssignableUser & {
  enrolled: boolean;
  isTeachingAssistant: boolean;
};

export type EnterpriseModuleAccessUsersResponse = {
  staff: EnterpriseAssignableUser[];
  students: EnterpriseAssignableUser[];
};

export type EnterpriseModuleAccessResponse = {
  module: EnterpriseModuleRecord;
  staff: EnterpriseModuleAccessStaff[];
  students: EnterpriseModuleAccessStudent[];
};

export type EnterpriseModuleAccessSelectionResponse = {
  module: EnterpriseModuleRecord;
  leaderIds: number[];
  taIds: number[];
  studentIds: number[];
};

export type CreateEnterpriseModulePayload = {
  name: string;
  code?: string;
  briefText?: string;
  timelineText?: string;
  expectationsText?: string;
  readinessNotesText?: string;
  leaderIds?: number[];
  taIds?: number[];
  studentIds?: number[];
};

export type UpdateEnterpriseModuleStudentsPayload = {
  studentIds: number[];
};

export type UpdateEnterpriseModuleStudentsResponse = {
  moduleId: number;
  studentIds: number[];
  studentCount: number;
};

export type DeleteEnterpriseModuleResponse = {
  moduleId: number;
  deleted: true;
};

export type UpdateEnterpriseModulePayload = {
  name: string;
  code?: string;
  briefText?: string;
  timelineText?: string;
  expectationsText?: string;
  readinessNotesText?: string;
  leaderIds?: number[];
  taIds?: number[];
  studentIds?: number[];
};

export const __enterpriseTypesCoverageMarker = true;
