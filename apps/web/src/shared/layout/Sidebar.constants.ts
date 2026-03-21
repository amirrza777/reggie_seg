import type { SpaceKey } from "./Sidebar.types";

export const SPACE_LABELS: Record<SpaceKey, string> = {
  workspace: "Workspace",
  staff: "Staff",
  enterprise: "Enterprise",
  admin: "Admin",
};

export const SPACE_ORDER: SpaceKey[] = ["workspace", "staff", "enterprise", "admin"];

export const MOBILE_DRAWER_PERSIST_KEY = "app-shell-mobile-drawer-open";
export const MOBILE_DRAWER_SPACE_KEY = "app-shell-mobile-drawer-space";
