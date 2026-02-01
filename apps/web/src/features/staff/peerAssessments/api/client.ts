import { apiFetch } from "@/shared/api/http";
import type { ProgressCardData } from "@/shared/ui/ProgressCard";

export type ModuleSummary = {
    id?: number;
    title: string;
    submitted: number;
    expected: number;
  };

export async function getMyModules(staffId: number): Promise<ModuleSummary[]> {
  return await apiFetch<ModuleSummary[]>(`/staff/peer-assessments/modules?staffId=${staffId}`);
}
