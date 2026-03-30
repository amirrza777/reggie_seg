import {
  getStaffProjectWarningsConfig,
  updateStaffProjectWarningsConfig,
} from "@/features/projects/api/client";
import type {
  ProjectWarningsConfig,
  StaffProjectWarningsConfigResponse,
} from "@/features/projects/types";

export function getProjectWarningsConfig(
  projectId: number,
): Promise<StaffProjectWarningsConfigResponse> {
  return getStaffProjectWarningsConfig(projectId);
}

export function updateProjectWarningsConfig(
  projectId: number,
  warningsConfig: ProjectWarningsConfig,
): Promise<StaffProjectWarningsConfigResponse> {
  return updateStaffProjectWarningsConfig(projectId, warningsConfig);
}
