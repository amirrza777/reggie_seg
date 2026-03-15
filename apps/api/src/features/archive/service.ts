import {
  listAllModules,
  listAllProjects,
  listAllTeams,
  setModuleArchived,
  setProjectArchived,
  setTeamArchived,
} from "./repo.js";

export function getModules() {
  return listAllModules();
}

export function getProjects() {
  return listAllProjects();
}

export function getTeams() {
  return listAllTeams();
}

export function archiveModule(id: number) {
  return setModuleArchived(id, new Date());
}

export function unarchiveModule(id: number) {
  return setModuleArchived(id, null);
}

export function archiveProject(id: number) {
  return setProjectArchived(id, new Date());
}

export function unarchiveProject(id: number) {
  return setProjectArchived(id, null);
}

export function archiveTeam(id: number) {
  return setTeamArchived(id, new Date());
}

export function unarchiveTeam(id: number) {
  return setTeamArchived(id, null);
}
