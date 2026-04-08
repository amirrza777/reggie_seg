"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from "react";
import {
  getTeamBoard,
  mergeSectionConfigWithDefaults,
  putTrelloSectionConfig,
  TRELLO_SECTION_STATUSES,
} from "@/features/trello/api/client";
import { useProjectWorkspaceCanEdit } from "@/features/projects/workspace/ProjectWorkspaceCanEditContext";
import { SECTION_STATUS_LABELS } from "@/features/trello/lib/listStatus";
import { useTrelloBoard } from "@/features/trello/context/TrelloBoardContext";
import { SkeletonText } from "@/shared/ui/Skeleton";
import "@/features/trello/styles/configure.css";

type Props = {
  projectId: string;
  teamId: number;
  teamName?: string;
};

type TrelloListName = { id: string; name: string };

type BoolSetter = Dispatch<SetStateAction<boolean>>;
type ErrorSetter = Dispatch<SetStateAction<string | null>>;
type ListNamesSetter = Dispatch<SetStateAction<TrelloListName[]>>;
type ConfigSetter = Dispatch<SetStateAction<Record<string, string>>>;

type TrelloLoadHookParams = {
  teamId: number;
  setLoading: BoolSetter;
  setError: ErrorSetter;
  setListNames: ListNamesSetter;
  setConfig: ConfigSetter;
};

type TrelloLoadRuntimeParams = TrelloLoadHookParams & {
  isCancelled: () => boolean;
};

type TrelloSaveParams = {
  projectId: string;
  teamId: number;
  config: Record<string, string>;
  setSaving: BoolSetter;
  setError: ErrorSetter;
  loadTeamBoard: (() => Promise<void>) | undefined;
  push: (href: string) => void;
};

function applyLoadedBoardData(result: Awaited<ReturnType<typeof getTeamBoard>>, params: TrelloLoadRuntimeParams) {
  if (!result.ok) {
    params.setError("Could not load board. You may need to join the board on Trello first.");
    params.setListNames([]);
    return;
  }
  const lists = result.view.board.lists ?? [];
  params.setListNames(lists.map((list) => ({ id: list.id, name: list.name })));
  params.setConfig(mergeSectionConfigWithDefaults(lists.map((list) => list.name), result.sectionConfig));
}

async function loadTrelloConfiguration(params: TrelloLoadRuntimeParams) {
  params.setLoading(true);
  params.setError(null);
  try {
    const result = await getTeamBoard(params.teamId);
    if (!params.isCancelled()) {
      applyLoadedBoardData(result, params);
    }
  } catch (error) {
    if (!params.isCancelled()) {
      params.setError(error instanceof Error ? error.message : "Failed to load board.");
    }
  } finally {
    if (!params.isCancelled()) {
      params.setLoading(false);
    }
  }
}

function useLoadTrelloConfiguration(params: TrelloLoadHookParams) {
  const { teamId, setLoading, setError, setListNames, setConfig } = params;
  useEffect(() => {
    let cancelled = false;
    void loadTrelloConfiguration({
      teamId,
      setLoading,
      setError,
      setListNames,
      setConfig,
      isCancelled: () => cancelled,
    });
    return () => {
      cancelled = true;
    };
  }, [teamId, setConfig, setError, setListNames, setLoading]);
}

function useSaveTrelloConfiguration(params: TrelloSaveParams) {
  const { projectId, teamId, config, setSaving, setError, loadTeamBoard, push } = params;
  return useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      await putTrelloSectionConfig(teamId, config);
      await loadTeamBoard?.();
      push(`/projects/${projectId}/trello`);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to save configuration.");
    } finally {
      setSaving(false);
    }
  }, [config, loadTeamBoard, projectId, push, setError, setSaving, teamId]);
}

function useConfigureTrelloState(projectId: string, teamId: number) {
  const router = useRouter();
  const trelloBoard = useTrelloBoard();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listNames, setListNames] = useState<TrelloListName[]>([]);
  const [config, setConfig] = useState<Record<string, string>>({});
  useLoadTrelloConfiguration({ teamId, setLoading, setError, setListNames, setConfig });

  const setStatus = (listName: string, status: string) => {
    setConfig((previous) => ({ ...previous, [listName]: status }));
  };
  const handleSave = useSaveTrelloConfiguration({
    projectId,
    teamId,
    config,
    setSaving,
    setError,
    loadTeamBoard: trelloBoard?.loadTeamBoard,
    push: router.push,
  });

  return { loading, saving, error, listNames, config, setStatus, handleSave };
}

function ConfigureTrelloHeader() {
  return (
    <header className="projects-panel__header trello-configure__header">
      <h1 className="projects-panel__title">Configure Trello</h1>
      <p className="projects-panel__subtitle">
        Set a status for each list on your board. This is used for graphs and is shared within your team.
      </p>
    </header>
  );
}

function ConfigureTrelloLoadingView() {
  return (
    <section className="stack projects-panel trello-configure">
      <ConfigureTrelloHeader />
      <div role="status" aria-live="polite">
        <SkeletonText lines={2} widths={["36%", "78%"]} />
        <span className="ui-visually-hidden">Loading board sections...</span>
      </div>
    </section>
  );
}

function ConfigureTrelloGuidance() {
  return (
    <>
      <ul className="ui-bullet-list trello-configure__guidance">
        <li><strong>Backlog </strong>a list of cards containing work that has not been started yet.</li>
        <li><strong>Work in progress </strong>a list of cards containing work that someone is working on while the card is in this list. You may use multiple "Work in progress" lists if processing your cards takes a number of different steps.</li>
        <li><strong>Completed </strong>a list of cards containing work that is finished.</li>
        <li><strong>For information only </strong>a list of cards that do not correspond to activities and are provided for information only. Cards in this list are not supposed to move to other lists to reflect progress in the project and will not be included in Trello board statistics.</li>
      </ul>
      <p className="ui-note ui-note--muted">Your board should contain a minimum of three lists - one for Backlog, Work in progress, and Completed.</p>
    </>
  );
}

function ConfigureTrelloRows({
  listNames,
  config,
  saving,
  setStatus,
  handleSave,
}: {
  listNames: TrelloListName[];
  config: Record<string, string>;
  saving: boolean;
  setStatus: (listName: string, status: string) => void;
  handleSave: () => Promise<void>;
}) {
  return (
    <div className="trello-configure__rows">
      {listNames.map((list) => (
        <div key={list.id} className="trello-configure__row">
          <span className="trello-configure__row-name">{list.name}</span>
          <select value={config[list.name]} onChange={(event) => setStatus(list.name, event.target.value)} className="trello-configure__row-select">
            {TRELLO_SECTION_STATUSES.map((status) => <option key={status} value={status}>{SECTION_STATUS_LABELS[status] ?? status}</option>)}
          </select>
        </div>
      ))}
      <div className="trello-configure__actions">
        <button type="button" className="btn btn--primary btn--sm" onClick={() => void handleSave()} disabled={saving}>{saving ? "Saving..." : "Save and view board"}</button>
      </div>
    </div>
  );
}

function ConfigureTrelloCard({
  error,
  listNames,
  config,
  saving,
  setStatus,
  handleSave,
}: {
  error: string | null;
  listNames: TrelloListName[];
  config: Record<string, string>;
  saving: boolean;
  setStatus: (listName: string, status: string) => void;
  handleSave: () => Promise<void>;
}) {
  return (
    <div className="card trello-configure__card">
      <ConfigureTrelloGuidance />
      {error ? <p role="alert" className="ui-note ui-note--error">{error}</p> : null}
      {listNames.length === 0 && !error ? <p className="ui-note ui-note--muted">No lists found on the board.</p> : <ConfigureTrelloRows listNames={listNames} config={config} saving={saving} setStatus={setStatus} handleSave={handleSave} />}
    </div>
  );
}

export function ConfigureTrelloContent({ projectId, teamId }: Props) {
  const { canEdit } = useProjectWorkspaceCanEdit();
  const state = useConfigureTrelloState(projectId, teamId);

  if (!canEdit) {
    return (
      <section className="stack projects-panel trello-configure">
        <p className="muted">Trello configuration is not available while this module or project is archived.</p>
      </section>
    );
  }

  if (state.loading) {
    return <ConfigureTrelloLoadingView />;
  }

  return (
    <section className="stack projects-panel trello-configure">
      <ConfigureTrelloHeader />
      <ConfigureTrelloCard error={state.error} listNames={state.listNames} config={state.config} saving={state.saving} setStatus={state.setStatus} handleSave={state.handleSave} />
    </section>
  );
}
