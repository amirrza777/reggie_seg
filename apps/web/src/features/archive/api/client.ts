import { apiFetch } from "@/shared/api/http";
import type { ArchivableModule, ArchivableProject } from "../types";

export function getArchiveModules() {
  return apiFetch<ArchivableModule[]>("/archive/modules");
}

export function getArchiveProjects() {
  return apiFetch<ArchivableProject[]>("/archive/projects");
}

export function archiveItem(type: "modules" | "projects", id: number) {
  return apiFetch(`/archive/${type}/${id}/archive`, { method: "PATCH" });
}

export function unarchiveItem(type: "modules" | "projects", id: number) {
  return apiFetch(`/archive/${type}/${id}/unarchive`, { method: "PATCH" });
}
