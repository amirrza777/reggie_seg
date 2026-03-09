"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  getTeamBoard,
  mergeSectionConfigWithDefaults,
  putTrelloSectionConfig,
  TRELLO_SECTION_STATUSES,
} from "@/features/trello/api/client";
import { SECTION_STATUS_LABELS } from "@/features/trello/lib/listStatus";

type Props = {
  projectId: string;
  teamId: number;
  teamName?: string;
};

export function ConfigureTrelloContent({ projectId, teamId, teamName }: Props) {
  const router = useRouter();
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
      router.push(`/projects/${projectId}/trello`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save configuration.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <section className="section container">
        <div className="stack">
          <p className="muted">Loading board sections…</p>
        </div>
      </section>
    );
  }

  return (
    <section className="section container">
      <div className="stack">
        <h1>Configure Trello</h1>
        <p className="lede">
          Set a status for each list on your board. This is used for graphs and is shared within your team.
        <ul>
          <li><strong>Backlog </strong> a list of cards containing work that has not been started yet.</li>
          <li><strong>Work in progress </strong> a list of cards containing work that someone is working on while the card is in this list. You may use multiple "Work in progress" lists if processing your cards takes a number of different steps.</li>
          <li><strong>Completed </strong> a list of cards containing work that is finished.</li>
          <li><strong>For information only </strong> a list of cards that do not correspond to activities and are provided for information only. Cards in this list are not supposed to move to other lists to reflect progress in the project and will not be included in Trello board statistics.</li>
        </ul>
        Your board should contain a minimum of three lists - one for Backlog, Work in progress, and Completed.
        </p>
        {error ? (
          <p role="alert" className="muted" style={{ color: "var(--accent-strong)" }}>
            {error}
          </p>
        ) : null}
        {listNames.length === 0 && !error ? (
          <p className="muted">No lists found on the board.</p>
        ) : (
          <div className="stack">
            {listNames.map((list) => (
              <div key={list.id} className="placeholder" style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                <strong style={{ minWidth: 140 }}>{list.name}</strong>
                <select
                  value={config[list.name]}
                  onChange={(e) => setStatus(list.name, e.target.value)}
                  className="pill-nav__link"
                  style={{ minWidth: 200 }}
                >
                  {TRELLO_SECTION_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {SECTION_STATUS_LABELS[status] ?? status}
                    </option>
                  ))}
                </select>
              </div>
            ))}
            <div className="pill-nav">
              <button
                type="button"
                className="btn btn--primary"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Saving…" : "Save and view board"}
              </button>
            </div>
          </div>
        )}
        <Link href={`/projects/${projectId}/trello`} className="link-ghost">
          ← Back to Trello
        </Link>
      </div>
    </section>
  );
}
