import type { Role } from "@prisma/client";
import type { AuthRequest } from "../../auth/middleware.js";

export type EnterpriseUserRole = Extract<Role, "STAFF" | "ENTERPRISE_ADMIN" | "ADMIN">;

export type EnterpriseUser = {
  id: number;
  enterpriseId: string;
  role: EnterpriseUserRole;
};

export type EnterpriseRequest = AuthRequest & { enterpriseUser?: EnterpriseUser };

export type AssignableUser = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  active: boolean;
};

export type ParsedModulePayload = {
  name: string;
  code: string | null;
  briefText: string | null;
  expectationsText: string | null;
  readinessNotesText: string | null;
  leaderIds: number[];
  taIds: number[];
  studentIds: number[];
};
