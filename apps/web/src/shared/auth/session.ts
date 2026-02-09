import { cookies } from "next/headers";
import { apiFetch } from "@/shared/api/http";
export type UserRole = "STUDENT" | "STAFF" | "ADMIN";

export type SessionUser = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  isStaff: boolean;
  role?: UserRole;
  active?: boolean;
};

const normalizeUser = (user: SessionUser): SessionUser => ({
  ...user,
  role: user.role ?? (user.isStaff ? "STAFF" : "STUDENT"),
  active: user.active ?? true,
});

export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    const cookieHeader = (await cookies())
      .getAll()
      .map(({ name, value }) => `${name}=${value}`)
      .join("; ");

    const user = await apiFetch<SessionUser>("/auth/me", {
      headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
    });

    return normalizeUser(user);
  } catch {
    return null;
  }
}

export function isAdmin(user: SessionUser | null | undefined): user is SessionUser & { role: "ADMIN" } {
  return Boolean(user && user.role === "ADMIN");
}