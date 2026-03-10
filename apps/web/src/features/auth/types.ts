export type LoginCredentials = {
  email: string;
  password: string;
};

export type SignupPayload = {
  enterpriseCode: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role?: "STUDENT" | "STAFF" | "ENTERPRISE_ADMIN";
};

export type AuthResponse = {
  accessToken?: string;
  message?: string;
};

export type UserProfile = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role?: "STUDENT" | "STAFF" | "ENTERPRISE_ADMIN" | "ADMIN";
  isStaff?: boolean;
  isAdmin?: boolean;
  isEnterpriseAdmin?: boolean;
  active?: boolean;
  suspended?: boolean;
  avatarBase64?: string | null;
  avatarMime?: string | null;
};
