export type EnterpriseModuleRecord = {
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string;
  studentCount: number;
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

export type CreateEnterpriseModulePayload = {
  name: string;
};

export type UpdateEnterpriseModuleStudentsPayload = {
  studentIds: number[];
};

export type UpdateEnterpriseModuleStudentsResponse = {
  moduleId: number;
  studentIds: number[];
  studentCount: number;
};
