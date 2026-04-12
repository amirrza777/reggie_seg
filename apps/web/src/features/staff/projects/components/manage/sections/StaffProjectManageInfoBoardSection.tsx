"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { patchStaffProjectManage } from "@/features/projects/api/client";
import { ApiError } from "@/shared/api/errors";
import { StaffProjectManageFormCollapsible } from "../../StaffProjectManageFormCollapsible";
import { useStaffProjectManageSetup } from "../StaffProjectManageSetupContext";

const MAX_LEN = 8000;

export function StaffProjectManageInfoBoardSection() {
  const router = useRouter();
  const { projectId, initial, detailsDisabled } = useStaffProjectManageSetup();
  const [text, setText] = useState(initial.informationText ?? "");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState<string | null>(null);

  useEffect(() => {
    setText(initial.informationText ?? "");
  }, [initial.informationText]);

  const onSave = useCallback(async () => {
    if (detailsDisabled) return;
    const trimmed = text.trim();
    const next = trimmed.length === 0 ? null : trimmed;
    const prev = (initial.informationText ?? "").trim();
    const prevNorm = prev.length === 0 ? null : prev;
    if (next === prevNorm) {
      setSaveOk("No changes to save.");
      setSaveError(null);
      return;
    }
    if (trimmed.length > MAX_LEN) {
      setSaveError(`Use at most ${MAX_LEN} characters.`);
      return;
    }
    setSaving(true);
    setSaveError(null);
    setSaveOk(null);
    try {
      await patchStaffProjectManage(projectId, { informationText: next });
      setSaveOk("Information board updated.");
      router.refresh();
    } catch (e: unknown) {
      setSaveError(e instanceof ApiError ? e.message : "Could not save information board.");
    } finally {
      setSaving(false);
    }
  }, [detailsDisabled, initial.informationText, projectId, router, text]);

  const controlsDisabled = detailsDisabled || saving;

  return (
    <StaffProjectManageFormCollapsible title="Student information board" defaultOpen={false}>
      <p className="ui-note ui-note--muted">
        This text appears on the student-facing project overview information board. Line breaks separate paragraphs.
      </p>
      <label className="staff-projects__field" htmlFor={`project-info-board-${projectId}`} style={{ marginTop: 12 }}>
        <span className="staff-projects__field-label">Information board text</span>
        <textarea
          id={`project-info-board-${projectId}`}
          className="staff-projects__input staff-projects__textarea"
          value={text}
          disabled={controlsDisabled}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add project expectations, process notes, and key instructions for students."
          rows={8}
          maxLength={MAX_LEN}
        />
      </label>
      <p className="muted" style={{ marginTop: 6 }}>
        {text.length}/{MAX_LEN} characters
      </p>
      <button type="button" className="btn btn--primary" disabled={controlsDisabled} onClick={() => void onSave()}>
        {saving ? "Saving…" : "Save information board"}
      </button>
      {saveOk ? <p className="staff-projects__success">{saveOk}</p> : null}
      {saveError ? <p className="staff-projects__error">{saveError}</p> : null}
    </StaffProjectManageFormCollapsible>
  );
}
