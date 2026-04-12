"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMyQuestionnaires } from "@/features/questionnaires/api/client";
import type { Questionnaire } from "@/features/questionnaires/types";
import { patchStaffProjectManage } from "@/features/projects/api/client";
import { ApiError } from "@/shared/api/errors";
import { StaffProjectManageFormCollapsible } from "../../StaffProjectManageFormCollapsible";
import { loadProjectPeerTemplates } from "../../StaffProjectCreatePanel.templates";
import { useStaffProjectManageSetup } from "../StaffProjectManageSetupContext";

export function StaffProjectManagePeerTemplateSection() {
  const router = useRouter();
  const { projectId, initial, detailsDisabled, isArchived, moduleArchived } = useStaffProjectManageSetup();
  const [templates, setTemplates] = useState<Questionnaire[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState(String(initial.questionnaireTemplateId));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    void loadProjectPeerTemplates({
      templateId: String(initial.questionnaireTemplateId),
      getMyQuestionnaires,
      isMounted: () => mounted,
      setIsLoadingTemplates: setLoading,
      setTemplatesError: setLoadError,
      setTemplates,
      setSelectedTemplateOption: () => {},
    });
    return () => {
      mounted = false;
    };
  }, [initial.questionnaireTemplateId]);

  useEffect(() => {
    setSelectedId(String(initial.questionnaireTemplateId));
  }, [initial.questionnaireTemplateId]);

  const peerTemplates = templates.filter((t) => t.purpose === "PEER_ASSESSMENT");
  const submissionLocked = initial.hasSubmittedPeerAssessments === true;
  const archiveReadOnly = isArchived || moduleArchived;
  const controlsDisabled = detailsDisabled || saving || submissionLocked;

  const onSave = useCallback(async () => {
    const next = Number.parseInt(selectedId, 10);
    if (!Number.isInteger(next) || next <= 0) {
      setSaveError("Choose a questionnaire template.");
      return;
    }
    if (next === initial.questionnaireTemplateId) {
      setSaveOk("No changes to save.");
      setSaveError(null);
      return;
    }
    if (archiveReadOnly) {
      setSaveError(
        "The questionnaire template cannot be changed while this project is archived.",
      );
      return;
    }
    if (initial.hasSubmittedPeerAssessments) {
      setSaveError("The questionnaire cannot be changed after peer assessments have been submitted.");
      return;
    }
    setSaving(true);
    setSaveError(null);
    setSaveOk(null);
    try {
      await patchStaffProjectManage(projectId, { questionnaireTemplateId: next });
      setSaveOk("Questionnaire template updated.");
      router.refresh();
    } catch (e: unknown) {
      setSaveError(e instanceof ApiError ? e.message : "Could not update template.");
    } finally {
      setSaving(false);
    }
  }, [
    archiveReadOnly,
    initial.hasSubmittedPeerAssessments,
    initial.questionnaireTemplateId,
    projectId,
    router,
    selectedId,
  ]);

  const currentName = initial.questionnaireTemplate?.templateName ?? "Unknown template";

  return (
    <StaffProjectManageFormCollapsible title="Peer assessment questionnaire" defaultOpen={false}>
      <p className="ui-note ui-note--muted">
        Students use this template when completing peer assessments. It cannot be changed after the first assessment
        has been submitted.
      </p>
      <p className="muted" style={{ marginTop: 8 }}>
        Current: <strong>{currentName}</strong>
      </p>

      {loadError ? <p className="staff-projects__error">{loadError}</p> : null}
      {loading ? <p className="muted">Loading templates…</p> : null}

      {!loading && !loadError ? (
        <div className="stack" style={{ marginTop: 12, gap: 12 }}>
          {archiveReadOnly ? (
            <p className="ui-note ui-note--muted" style={{ margin: 0 }}>
              This template is read-only because this project is archived.
            </p>
          ) : null}
          {submissionLocked && !archiveReadOnly ? (
            <p className="ui-note ui-note--muted" style={{ margin: 0 }}>
              This template is locked because peer assessments have already been submitted.
            </p>
          ) : null}
          <label className="enterprise-modules__create-field-label" htmlFor={`peer-template-${projectId}`}>
            Template
          </label>
          <select
            id={`peer-template-${projectId}`}
            className="enterprise-modules__search"
            value={selectedId}
            disabled={controlsDisabled}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            {initial.questionnaireTemplate &&
            !peerTemplates.some((t) => t.id === initial.questionnaireTemplate!.id) ? (
              <option value={String(initial.questionnaireTemplate.id)}>
                {initial.questionnaireTemplate.templateName} (current)
              </option>
            ) : null}
            {peerTemplates.map((t) => (
              <option key={t.id} value={String(t.id)}>
                {t.templateName}
              </option>
            ))}
          </select>
          <button type="button" className="btn btn--primary" disabled={controlsDisabled} onClick={() => void onSave()}>
            {saving ? "Saving…" : "Save template"}
          </button>
        </div>
      ) : null}

      {saveOk ? <p className="staff-projects__success">{saveOk}</p> : null}
      {saveError ? <p className="staff-projects__error">{saveError}</p> : null}
    </StaffProjectManageFormCollapsible>
  );
}
