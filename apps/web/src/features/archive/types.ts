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
  module: { name: string; archivedAt: string | null };
  _count: { teams: number };
};

export type ArchiveTab = "modules" | "projects";
