export type ArchivableModule = {
  id: number;
  name: string;
  archivedAt: string | null;
  _count: { projects: number };
};

export type ArchivableProject = {
  id: number;
  name: string;
  archivedAt: string | null;
  module: { name: string };
  _count: { teams: number };
};

export type ArchivableTeam = {
  id: number;
  teamName: string;
  archivedAt: string | null;
  project: { name: string };
  _count: { allocations: number };
};

export type ArchiveTab = "modules" | "projects" | "teams";
