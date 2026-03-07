import type { UserRole } from "@/shared/auth/session";

export type FeatureFlag = {
  key: string;
  label: string;
  enabled: boolean;
};

export type AdminUser = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  isStaff: boolean;
  role: UserRole;
  active: boolean;
};

export type AdminUserUpdate = {
  role?: UserRole;
  active?: boolean;
};

export type AdminUserRecord = Omit<AdminUser, "role" | "active"> &
  Partial<Pick<AdminUser, "role" | "active">>;

export type { UserRole };

export type AuditAction = "LOGIN" | "LOGOUT";

export type AuditLogEntry = {
  id: number;
  action: AuditAction;
  createdAt: string;
  ip: string | null;
  userAgent: string | null;
  user: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
  };
};

export type AdminSummary = {
  users: number;
  modules: number;
  teams: number;
  meetings: number;
};

export type EnterpriseRecord = {
  id: string;
  name: string;
  code: string;
  createdAt: string;
  users: number;
  admins: number;
  enterpriseAdmins: number;
  staff: number;
  students: number;
  modules: number;
  teams: number;
};

export type CreateEnterprisePayload = {
  name: string;
  code?: string;
};
