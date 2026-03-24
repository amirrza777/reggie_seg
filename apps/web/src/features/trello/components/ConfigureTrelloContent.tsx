"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  getTeamBoard,
  mergeSectionConfigWithDefaults,
  putTrelloSectionConfig,
  TRELLO_SECTION_STATUSES,
} from "@/features/trello/api/client";
import { SECTION_STATUS_LABELS } from "@/features/trello/lib/listStatus";
import { useTrelloBoard } from "@/features/trello/context/TrelloBoardContext";
import "@/features/trello/styles/configure.css";

type Props = {
  projectId: string;
  teamId: number;
  teamName?: string;
};

export function ConfigureTrelloContent({ projectId, teamId }: Props) {
  const router = useRouter();
  const trelloBoard = useTrelloBoard();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listNames, setListNames] = useState<{ id: string; name: string }[]>([]);
  const [config, setConfig] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getTeamBoard(teamId)
      .then((result) => {
        if (cancelled) return;
        if (!result.ok) {
          setError("Could not load board. You may need to join the board on Trello first.");
          setListNames([]);
          return;
        }
        const lists = result.view.board.lists ?? [];
        const names = lists.map((l) => l.name);
        setListNames(lists.map((l) => ({ id: l.id, name: l.name })));
        setConfig(mergeSectionConfigWithDefaults(names, result.sectionConfig));
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load board.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [teamId]);

  const setStatus = (listName: string, status: string) => {
    setConfig((prev) => ({ ...prev, [listName]: status }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await putTrelloSectionConfig(teamId, config);
      // Refresh shared board state so summary/board/graphs show the new config without refetch on every page change
      await trelloBoard?.loadTeamBoard?.();
      router.push(`/projects/${projectId}/trello`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save configuration.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <section className="stack projects-panel trello-configure">
        <header className="projects-panel__header trello-configure__header">
          <h1 className="projects-panel__title">Configure Trello</h1>
          <p className="projects-panel__subtitle">
            Set a status for each list on your board. This is used for graphs and is shared within your team.
          </p>
        </header>
        <p className="ui-note ui-note--muted">Loading board sections...</p>
      </section>
    );
  }

  return (
    <section className="stack projects-panel trello-configure">
      <header className="projects-panel__header trello-configure__header">
        <h1 className="projects-panel__title">Configure Trello</h1>
        <p className="projects-panel__subtitle">
          Set a status for each list on your board. This is used for graphs and is shared within your team.
        </p>
      </header>

      <div className="card trello-configure__card">
        <ul className="ui-bullet-list trello-configure__guidance">
          <li>
            <strong>Backlog </strong>
            a list of cards containing work that has not been started yet.
          </li>
          <li>
            <strong>Work in progress </strong>
            a list of cards containing work that someone is working on while the card is in this list. You may use
            multiple "Work in progress" lists if processing your cards takes a number of different steps.
          </li>
          <li>
            <strong>Completed </strong>
            a list of cards containing work that is finished.
          </li>
          <li>
            <strong>For information only </strong>
            a list of cards that do not correspond to activities and are provided for information only. Cards in this
            list are not supposed to move to other lists to reflect progress in the project and will not be included
            in Trello board statistics.
          </li>
        </ul>
        <p className="ui-note ui-note--muted">
          Your board should contain a minimum of three lists - one for Backlog, Work in progress, and Completed.
        </p>

        {error ? <p role="alert" className="ui-note ui-note--error">{error}</p> : null}

        {listNames.length === 0 && !error ? (
          <p className="ui-note ui-note--muted">No lists found on the board.</p>
        ) : (
          <div className="trello-configure__rows">
            {listNames.map((list) => (
              <div key={list.id} className="trello-configure__row">
                <span className="trello-configure__row-name">{list.name}</span>
                <select
                  value={config[list.name]}
                  onChange={(e) => setStatus(list.name, e.target.value)}
                  className="trello-configure__row-select"
                >
                  {TRELLO_SECTION_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {SECTION_STATUS_LABELS[status] ?? status}
                    </option>
                  ))}
                </select>
              </div>
            ))}
            <div className="trello-configure__actions">
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save and view board"}
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
