"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { StudentProjectWorkspaceCapability } from "@/features/projects/lib/resolveStudentProjectWorkspaceCapability";

/** Default when no provider (e.g. tests): permissive UI; API still enforces auth. */
const DEFAULT_CAPABILITY: StudentProjectWorkspaceCapability = {
  hasTeam: false,
  workspaceArchived: false,
  canEdit: true,
};

const ProjectWorkspaceCanEditContext = createContext<StudentProjectWorkspaceCapability | null>(null);

export function ProjectWorkspaceCanEditProvider({
  value,
  children,
}: {
  value: StudentProjectWorkspaceCapability;
  children: ReactNode;
}) {
  return (
    <ProjectWorkspaceCanEditContext.Provider value={value}>{children}</ProjectWorkspaceCanEditContext.Provider>
  );
}

export function useProjectWorkspaceCanEdit(): StudentProjectWorkspaceCapability {
  return useContext(ProjectWorkspaceCanEditContext) ?? DEFAULT_CAPABILITY;
}
