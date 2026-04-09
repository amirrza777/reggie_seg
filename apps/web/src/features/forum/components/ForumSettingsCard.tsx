"use client";

import { useEffect, useRef, useState, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import { useUser } from "@/features/auth/useUser";
import { getForumSettings, updateForumSettings } from "@/features/forum/api/client";
import { Button } from "@/shared/ui/Button";
import { Skeleton, SkeletonText } from "@/shared/ui/Skeleton";
import "../styles/discussion-forum.css";

type ForumSettingsCardProps = {
  projectId: number;
  readOnly?: boolean;
};

type ForumSettingsState = {
  loading: boolean;
  saving: boolean;
  error: string | null;
  anonymousStudents: boolean;
  isControlDisabled: boolean;
  handleToggle: (value: boolean) => Promise<void>;
};

type BoolSetter = Dispatch<SetStateAction<boolean>>;
type ErrorSetter = Dispatch<SetStateAction<string | null>>;

type ForumSettingsLoadParams = {
  userId: number | null;
  projectId: number;
  requestIdRef: MutableRefObject<number>;
  setLoading: BoolSetter;
  setError: ErrorSetter;
  setAnonymousStudents: BoolSetter;
};

type ForumSettingsSaveParams = {
  userId: number | null;
  projectId: number;
  value: boolean;
  requestIdRef: MutableRefObject<number>;
  setSaving: BoolSetter;
  setError: ErrorSetter;
  setAnonymousStudents: BoolSetter;
};

function applyUnsignedUserForumSettingsState(params: ForumSettingsLoadParams) {
  if (params.userId == null) {
    params.setLoading(false);
    params.setError(null);
    params.setAnonymousStudents(false);
    return true;
  }
  return false;
}

async function loadForumSettings(params: ForumSettingsLoadParams) {
  const requestId = ++params.requestIdRef.current;
  if (applyUnsignedUserForumSettingsState(params)) {
    return;
  }

  params.setLoading(true);
  params.setError(null);
  try {
    const settings = await getForumSettings(params.userId as number, params.projectId);
    if (requestId === params.requestIdRef.current) {
      params.setAnonymousStudents(settings.forumIsAnonymous);
    }
  } catch {
    if (requestId === params.requestIdRef.current) {
      params.setError("Unable to load forum settings.");
    }
  } finally {
    if (requestId === params.requestIdRef.current) {
      params.setLoading(false);
    }
  }
}

async function saveForumSettings(params: ForumSettingsSaveParams) {
  if (params.userId == null) {
    return;
  }

  const requestId = ++params.requestIdRef.current;
  params.setSaving(true);
  params.setError(null);
  try {
    const next = await updateForumSettings(params.userId, params.projectId, params.value);
    if (requestId === params.requestIdRef.current) {
      params.setAnonymousStudents(next.forumIsAnonymous);
    }
  } catch {
    if (requestId === params.requestIdRef.current) {
      params.setError("Unable to update forum settings.");
    }
  } finally {
    if (requestId === params.requestIdRef.current) {
      params.setSaving(false);
    }
  }
}

function useForumSettingsState(projectId: number, userId: number | null, readOnly: boolean): ForumSettingsState {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [anonymousStudents, setAnonymousStudents] = useState(false);
  const loadRequestIdRef = useRef(0);
  const saveRequestIdRef = useRef(0);

  useEffect(() => {
    void loadForumSettings({
      userId,
      projectId,
      requestIdRef: loadRequestIdRef,
      setLoading,
      setError,
      setAnonymousStudents,
    });
  }, [projectId, userId]);

  const handleToggle = async (value: boolean) => {
    if (readOnly) return;
    await saveForumSettings({
      userId,
      projectId,
      value,
      requestIdRef: saveRequestIdRef,
      setSaving,
      setError,
      setAnonymousStudents,
    });
  };

  return {
    loading,
    saving,
    error,
    anonymousStudents,
    isControlDisabled: loading || saving || userId == null || readOnly,
    handleToggle,
  };
}

function ForumSettingsActionButton({
  anonymousStudents,
  disabled,
  saving,
  onToggle,
}: {
  anonymousStudents: boolean;
  disabled: boolean;
  saving: boolean;
  onToggle: (value: boolean) => Promise<void>;
}) {
  const label = saving ? "Saving…" : anonymousStudents ? "Show student names" : "Make anonymous";

  return (
    <Button type="button" variant="secondary" disabled={disabled} onClick={() => void onToggle(!anonymousStudents)}>
      {label}
    </Button>
  );
}

export function ForumSettingsCard({ projectId, readOnly = false }: ForumSettingsCardProps) {
  const { user } = useUser();
  const state = useForumSettingsState(projectId, user?.id ?? null, readOnly);

  return (
    <div className="stack forum-settings-card">
      {state.error ? <p className="muted">{state.error}</p> : null}
      <div className="forum-settings-card__embed-row">
        <div className="forum-settings-card__embed-copy">
          {state.loading ? (
            <SkeletonText className="forum-settings-card__skeleton-text" lines={2} widths={["92%", "70%"]} />
          ) : (
            <>
              <p className="forum-settings-card__embed-lead">
                {state.anonymousStudents
                  ? "Posts on the forum are anonymous and not linked to students."
                  : "Student names are visible on posts."}
              </p>
              <p className="ui-note ui-note--muted forum-settings-card__embed-hint">
                Staff names stay visible. Use the button to switch how student posts appear.
              </p>
            </>
          )}
        </div>
        {!state.loading ? (
          <div className="forum-settings-card__embed-action">
            <ForumSettingsActionButton
              anonymousStudents={state.anonymousStudents}
              disabled={state.isControlDisabled}
              saving={state.saving}
              onToggle={state.handleToggle}
            />
          </div>
        ) : (
          <div className="forum-settings-card__embed-action-skeleton" aria-hidden="true">
            <Skeleton inline width={168} height={36} radius={8} />
          </div>
        )}
      </div>
      {!user ? <p className="muted">Sign in as staff to update these settings.</p> : null}
    </div>
  );
}
