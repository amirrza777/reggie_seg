import type { UserProfile } from "@/features/auth/types";
import type { SessionUser } from "./session";

type SpaceAwareUser =
  | Pick<UserProfile, "role" | "isAdmin" | "isEnterpriseAdmin" | "isStaff">
  | Pick<SessionUser, "role" | "isAdmin" | "isEnterpriseAdmin" | "isStaff">;

export function getDefaultSpaceOverviewPath(user: SpaceAwareUser | null | undefined): string {
  if (!user) return "/dashboard";

  const role = user.role;
  const isAdmin = role === "ADMIN" || user.isAdmin === true;
  if (isAdmin) return "/admin";

  const isEnterpriseAdmin = role === "ENTERPRISE_ADMIN" || user.isEnterpriseAdmin === true;
  if (isEnterpriseAdmin) return "/enterprise";

  const isStaff = role === "STAFF" || user.isStaff === true;
  if (isStaff) return "/staff/dashboard";

  return "/dashboard";
}
