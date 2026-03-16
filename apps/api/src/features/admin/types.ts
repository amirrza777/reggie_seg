import type { Request } from "express";
import type { User } from "@prisma/client";

export type UserRole = "STUDENT" | "STAFF" | "ADMIN" | "ENTERPRISE_ADMIN";

export type AdminUser = Pick<User, "id" | "email" | "enterpriseId" | "role">;

export type AdminRequest = Request & { adminUser?: AdminUser };

export type EnterpriseFlagSeed = { key: string; label: string; enabled: boolean };
