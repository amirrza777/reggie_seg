import { apiFetch } from "@/shared/api/http";
import type { Project } from "../types";

export async function getProject(projectId: string): Promise<Project> {
  return apiFetch<Project>(`/projects/${projectId}`);
}

export async function getUserProjects(userId: number): Promise<Project[]> {
  return apiFetch<Project[]>(`/projects?userId=${userId}`);
}
