"use client";

import { useEffect, useState } from "react";
import { useUser } from "@/features/auth/context";
import { getForumSettings, updateForumSettings } from "@/features/forum/api/client";

type ForumSettingsCardProps = {
  projectId: number;
};

export function ForumSettingsCard({ projectId }: ForumSettingsCardProps) {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [anonymousStudents, setAnonymousStudents] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setError(null);
    getForumSettings(user.id, projectId)
      .then((settings) => setAnonymousStudents(settings.forumIsAnonymous))
      .catch((err) => {
        console.error(err);
        setError("Unable to load forum settings.");
      })
      .finally(() => setLoading(false));
  }, [user, projectId]);

  const handleToggle = async (value: boolean) => {
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      const next = await updateForumSettings(user.id, projectId, value);
      setAnonymousStudents(next.forumIsAnonymous);
    } catch (err) {
      console.error(err);
      setError("Unable to update forum settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card stack" style={{ padding: 20 }}>
      <div>
        <h3 style={{ marginBottom: 6 }}>Forum anonymity</h3>
        <p className="muted" style={{ margin: 0 }}>
          Control whether student names are visible in the project forum. Staff names are always visible.
        </p>
      </div>
      {error ? <p className="muted">{error}</p> : null}
      <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <input
          type="checkbox"
          checked={anonymousStudents}
          onChange={(event) => handleToggle(event.target.checked)}
          disabled={loading || saving || !user}
          style={{
            width: 18,
            height: 18,
            accentColor: "#1f6feb",
          }}
        />
        <span>Hide student names</span>
      </label>
      {loading ? <p className="muted">Loading settings…</p> : null}
      {saving ? <p className="muted">Saving…</p> : null}
      {!user ? <p className="muted">Sign in as staff to update these settings.</p> : null}
    </div>
  );
}
