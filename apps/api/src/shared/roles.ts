export function isStaffRole(role: string) {
  return role === "STAFF" || role === "ADMIN" || role === "ENTERPRISE_ADMIN";
}
