"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useUser } from "@/features/auth/useUser";
import { getForumSettings, updateForumSettings } from "@/features/forum/api/client";
import { Skeleton, SkeletonText } from "@/shared/ui/Skeleton";

type ForumSettingsCardProps = {
  projectId: number;
};

export function ForumSettingsCard({ projectId }: ForumSettingsCardProps) {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [anonymousStudents, setAnonymousStudents] = useState(false);
  const loadRequestIdRef = useRef(0);
  const saveRequestIdRef = useRef(0);
  const isControlDisabled = loading || saving || !user;

  const loadSettings = useCallback(async () => {
    const requestId = ++loadRequestIdRef.current;
    if (!user) {
      setLoading(false);
      setError(null);
      setAnonymousStudents(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const settings = await getForumSettings(user.id, projectId);
      if (requestId !== loadRequestIdRef.current) return;
      setAnonymousStudents(settings.forumIsAnonymous);
    } catch {
      if (requestId !== loadRequestIdRef.current) return;
      setError("Unable to load forum settings.");
    } finally {
      if (requestId === loadRequestIdRef.current) {
        setLoading(false);
      }
    }
  }, [user, projectId]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const handleToggle = async (value: boolean) => {
    if (!user) return;
    const requestId = ++saveRequestIdRef.current;
    setSaving(true);
    setError(null);
    try {
      const next = await updateForumSettings(user.id, projectId, value);
      if (requestId !== saveRequestIdRef.current) return;
      setAnonymousStudents(next.forumIsAnonymous);
    } catch {
      if (requestId !== saveRequestIdRef.current) return;
      setError("Unable to update forum settings.");
    } finally {
      if (requestId === saveRequestIdRef.current) {
        setSaving(false);
      }
    }
  };

  return (
    <div className="card stack forum-settings-card">
      <div>
        <h3 className="forum-settings-card__title">Forum anonymity</h3>
        <p className="muted forum-settings-card__desc">
          Control whether student names are visible in the project forum. Staff names are always visible.
        </p>
      </div>
      {error ? <p className="muted">{error}</p> : null}
      <label className={`forum-settings-card__toggle${isControlDisabled ? " is-disabled" : ""}`}>
        <input
          className="forum-settings-card__control"
          type="checkbox"
          checked={anonymousStudents}
          onChange={(event) => handleToggle(event.target.checked)}
          disabled={isControlDisabled}
        />
        <span className="forum-settings-card__control-indicator" aria-hidden="true" />
        <span className="forum-settings-card__toggle-text">Hide student names</span>
      </label>
      {loading ? (
        <div className="ui-stack-sm" role="status" aria-live="polite">
          <Skeleton inline width={18} height={18} radius={999} />
          <SkeletonText className="forum-settings-card__skeleton-text" lines={1} widths={["40%"]} />
          <span className="ui-visually-hidden">Loading settings…</span>
        </div>
      ) : null}
      {!user ? <p className="muted">Sign in as staff to update these settings.</p> : null}
    </div>
  );
}
