import { apiFetch } from "@/shared/api/http";
import type { ArchivableModule, ArchivableProject, ArchivableTeam } from "../types";

export function getArchiveModules() {
  return apiFetch<ArchivableModule[]>("/archive/modules");
}

export function getArchiveProjects() {
  return apiFetch<ArchivableProject[]>("/archive/projects");
}

export function getArchiveTeams() {
  return apiFetch<ArchivableTeam[]>("/archive/teams");
}

export function archiveItem(type: "modules" | "projects" | "teams", id: number) {
  return apiFetch(`/archive/${type}/${id}/archive`, { method: "PATCH" });
}

export function unarchiveItem(type: "modules" | "projects" | "teams", id: number) {
  return apiFetch(`/archive/${type}/${id}/unarchive`, { method: "PATCH" });
}
