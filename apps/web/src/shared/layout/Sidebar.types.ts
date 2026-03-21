import type { ReactNode } from "react";

export type SpaceKey = "workspace" | "staff" | "enterprise" | "admin";

export type SidebarMode = "full" | "desktop" | "mobile";

export type SidebarChildLink = {
  href: string;
  label: string;
  flag?: string;
};

export type SidebarLink = {
  href: string;
  label: string;
  space?: SpaceKey;
  flag?: string;
  children?: SidebarChildLink[];
  defaultExpanded?: boolean;
};

export type MobileSpaceLink = {
  href: string;
  label: string;
  activePaths?: string[];
};

export type SidebarProps = {
  title?: string;
  links: SidebarLink[];
  footer?: ReactNode;
  mode?: SidebarMode;
  mobileSpaces?: MobileSpaceLink[];
};

export type MobileSpaceOption = {
  key: SpaceKey;
  label: string;
};
