import { cookies, headers } from "next/headers";
import { apiFetch } from "@/shared/api/http";
import { API_BASE_URL, getApiBaseForRequest } from "@/shared/api/env";
export type UserRole = "STUDENT" | "STAFF" | "ENTERPRISE_ADMIN" | "ADMIN";

export type SessionUser = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  isStaff: boolean;
  isAdmin?: boolean;
  isEnterpriseAdmin?: boolean;
  role?: UserRole;
  active?: boolean;
  suspended?: boolean;
};

const normalizeUser = (user: SessionUser): SessionUser => {
  const role = user.role ?? (user.isAdmin ? "ADMIN" : user.isStaff ? "STAFF" : "STUDENT");

  return {
    ...user,
    role,
    active: user.active ?? true,
  };
};

export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);

    const cookieHeader = cookieStore
      .getAll()
      .map(({ name, value }) => `${name}=${value}`)
      .join("; ");

    const accessToken = cookieStore.get("tf_access_token")?.value?.trim() || null;

    // Keep API host aligned with the incoming host when on loopback
    const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
    const proto = headerStore.get("x-forwarded-proto") ?? "http";
    const resolvedBase = getApiBaseForRequest(host, proto) || API_BASE_URL;

    const user = await apiFetch<SessionUser>("/auth/me", {
      baseUrl: resolvedBase,
      headers: {
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
    });

    return normalizeUser(user);
  } catch (err: any) {
    // If suspended, surface as inactive user so layouts can show a suspension notice.
    if (err?.status === 403 && String(err?.message || "").toLowerCase().includes("suspend")) {
      return { id: -1, email: "", firstName: "", lastName: "", isStaff: false, role: "STUDENT", active: false, suspended: true };
    }
    return null;
  }
}

export function isAdmin(user: SessionUser | null | undefined): user is SessionUser & { role: "ADMIN" } {
  return Boolean(user && (user.role === "ADMIN" || user.isAdmin));
}

export function isEnterpriseAdmin(
  user: SessionUser | null | undefined
): user is SessionUser & { role: "ENTERPRISE_ADMIN" } {
  return Boolean(user && (user.role === "ENTERPRISE_ADMIN" || user.isEnterpriseAdmin));
}
