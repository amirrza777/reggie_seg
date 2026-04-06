"use client";

import { useEffect, useRef, useState, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import { useUser } from "@/features/auth/useUser";
import { getForumSettings, updateForumSettings } from "@/features/forum/api/client";
import { Skeleton, SkeletonText } from "@/shared/ui/Skeleton";

type ForumSettingsCardProps = {
  projectId: number;
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

function useForumSettingsState(projectId: number, userId: number | null): ForumSettingsState {
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

  return { loading, saving, error, anonymousStudents, isControlDisabled: loading || saving || userId == null, handleToggle };
}

function ForumSettingsHeader() {
  return (
    <div>
      <h3 className="forum-settings-card__title">Forum anonymity</h3>
      <p className="muted forum-settings-card__desc">
        Control whether student names are visible in the project forum. Staff names are always visible.
      </p>
    </div>
  );
}

function ForumSettingsToggle({
  anonymousStudents,
  isControlDisabled,
  onToggle,
}: {
  anonymousStudents: boolean;
  isControlDisabled: boolean;
  onToggle: (value: boolean) => Promise<void>;
}) {
  return (
    <label className={`forum-settings-card__toggle${isControlDisabled ? " is-disabled" : ""}`}>
      <input className="forum-settings-card__control" type="checkbox" checked={anonymousStudents} onChange={(event) => void onToggle(event.target.checked)} disabled={isControlDisabled} />
      <span className="forum-settings-card__control-indicator" aria-hidden="true" />
      <span className="forum-settings-card__toggle-text">Hide student names</span>
    </label>
  );
}

function ForumSettingsLoadingState() {
  return (
    <div className="ui-stack-sm" role="status" aria-live="polite">
      <Skeleton inline width={18} height={18} radius={999} />
      <SkeletonText className="forum-settings-card__skeleton-text" lines={1} widths={["40%"]} />
      <span className="ui-visually-hidden">Loading settings…</span>
    </div>
  );
}

export function ForumSettingsCard({ projectId }: ForumSettingsCardProps) {
  const { user } = useUser();
  const state = useForumSettingsState(projectId, user?.id ?? null);

  return (
    <div className="card stack forum-settings-card">
      <ForumSettingsHeader />
      {state.error ? <p className="muted">{state.error}</p> : null}
      <ForumSettingsToggle anonymousStudents={state.anonymousStudents} isControlDisabled={state.isControlDisabled} onToggle={state.handleToggle} />
      {state.loading ? <ForumSettingsLoadingState /> : null}
      {!user ? <p className="muted">Sign in as staff to update these settings.</p> : null}
    </div>
  );
}
