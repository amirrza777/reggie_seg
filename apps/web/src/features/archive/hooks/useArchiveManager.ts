import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from "react";
import type { ArchivableModule, ArchivableProject, ArchiveTab } from "../types";
import { archiveItem, getArchiveModules, getArchiveProjects, unarchiveItem } from "../api/client";
import type { ArchiveListScope } from "../lib/archiveScopes";

export type ArchiveManagerState = {
  activeTab: ArchiveTab;
  setActiveTab: Dispatch<SetStateAction<ArchiveTab>>;
  moduleListScope: ArchiveListScope;
  setModuleListScope: Dispatch<SetStateAction<ArchiveListScope>>;
  projectListScope: ArchiveListScope;
  setProjectListScope: Dispatch<SetStateAction<ArchiveListScope>>;
  modules: ArchivableModule[];
  projects: ArchivableProject[];
  fetching: boolean;
  loading: string | null;
  toggle: (type: ArchiveTab, id: number, isArchived: boolean) => Promise<void>;
};

function useArchiveDataLoad(
  setModules: Dispatch<SetStateAction<ArchivableModule[]>>,
  setProjects: Dispatch<SetStateAction<ArchivableProject[]>>,
  setFetching: Dispatch<SetStateAction<boolean>>,
) {
  useEffect(() => {
    Promise.all([getArchiveModules(), getArchiveProjects()])
      .then(([modules, projects]) => {
        setModules(modules);
        setProjects(projects);
      })
      .finally(() => setFetching(false));
  }, [setFetching, setModules, setProjects]);
}

function useArchiveToggle(params: {
  setLoading: Dispatch<SetStateAction<string | null>>;
  reloadLists: () => Promise<void>;
}) {
  return async (type: ArchiveTab, id: number, isArchived: boolean) => {
    const key = `${type}-${id}`;
    params.setLoading(key);
    try {
      if (isArchived) {
        await unarchiveItem(type, id);
      } else {
        await archiveItem(type, id);
      }
      await params.reloadLists();
    } catch {
    } finally {
      params.setLoading(null);
    }
  };
}

export function useArchiveManager(): ArchiveManagerState {
  const [activeTab, setActiveTab] = useState<ArchiveTab>("modules");
  const [moduleListScope, setModuleListScope] = useState<ArchiveListScope>("archived");
  const [projectListScope, setProjectListScope] = useState<ArchiveListScope>("all");
  const [modules, setModules] = useState<ArchivableModule[]>([]);
  const [projects, setProjects] = useState<ArchivableProject[]>([]);
  const [fetching, setFetching] = useState(true);
  const [loading, setLoading] = useState<string | null>(null);
  useArchiveDataLoad(setModules, setProjects, setFetching);

  const reloadLists = useCallback(async () => {
    const [nextModules, nextProjects] = await Promise.all([getArchiveModules(), getArchiveProjects()]);
    setModules(nextModules);
    setProjects(nextProjects);
  }, []);

  const toggle = useArchiveToggle({ setLoading, reloadLists });
  return {
    activeTab,
    setActiveTab,
    moduleListScope,
    setModuleListScope,
    projectListScope,
    setProjectListScope,
    modules,
    projects,
    fetching,
    loading,
    toggle,
  };
}
