"use client";

import { usePathname } from "next/navigation";
import { StaffProjectSectionNav } from "./StaffProjectSectionNav";


export function StaffProjectSectionNavGate({
  projectId,
  moduleId,
  canManageProjectSettings,
}: {
  projectId: string;
  moduleId: number | null;
  canManageProjectSettings?: boolean;
}) {
  const pathname = usePathname() ?? "";
  if (pathname.includes("/teams/")) {
    return null;
  }
  return (
    <StaffProjectSectionNav
      projectId={projectId}
      moduleId={moduleId}
      canManageProjectSettings={canManageProjectSettings}
    />
  );
}
