import type { SignOptions } from "jsonwebtoken";

export const accessSecret = process.env.JWT_ACCESS_SECRET || "";
export const refreshSecret = process.env.JWT_REFRESH_SECRET || "";
export const accessTtl = process.env.JWT_ACCESS_TTL || "900s";
export const refreshTtl = process.env.JWT_REFRESH_TTL || "30d";
export const accessExpiresIn = accessTtl as NonNullable<SignOptions["expiresIn"]>;
export const refreshExpiresIn = refreshTtl as NonNullable<SignOptions["expiresIn"]>;
export const resetTtl = process.env.PASSWORD_RESET_TTL || "1h";
export const appBaseUrl = (process.env.APP_BASE_URL || "http://localhost:3001").replace(/\/$/, "");
export const resetDebug = process.env.PASSWORD_RESET_DEBUG === "true";
export const emailChangeTtl = process.env.EMAIL_CHANGE_TTL || "15m";
export const REMOVED_USERS_ENTERPRISE_CODE = (process.env.REMOVED_USERS_ENTERPRISE_CODE ?? "UNASSIGNED").toUpperCase();
export const REMOVED_USERS_ENTERPRISE_NAME = process.env.REMOVED_USERS_ENTERPRISE_NAME ?? "Unassigned";
export const SUPER_ADMIN_EMAIL = (process.env.SUPER_ADMIN_EMAIL ?? "admin@kcl.ac.uk").toLowerCase();
export const bootstrapAdminEmail = process.env.ADMIN_BOOTSTRAP_EMAIL?.toLowerCase();
export const bootstrapAdminPassword = process.env.ADMIN_BOOTSTRAP_PASSWORD;
