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
