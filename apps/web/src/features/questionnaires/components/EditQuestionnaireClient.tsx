"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { logDevError } from "@/shared/lib/devLogger";
import { Button } from "@/shared/ui/Button";
import { FormField } from "@/shared/ui/FormField";
import { SkeletonText } from "@/shared/ui/Skeleton";
import type {
  EditableQuestion,
  MultipleChoiceConfigs,
  QuestionnairePurpose,
  QuestionType,
  SliderConfigs,
} from "@/features/questionnaires/types";
import { createQuestionnaire, getQuestionnaireById, updateQuestionnaire } from "../api/client";
import {
  DEFAULT_QUESTIONNAIRE_PURPOSE,
  normalizeQuestionnairePurpose,
} from "../purpose";
import {
  CancelQuestionnaireButton,
  QuestionnairePurposeButtons,
  QuestionnaireVisibilityButtons,
} from "./SharedQuestionnaireButtons";
import { EditQuestionnaireQuestionList } from "./EditQuestionnaireQuestionList";

export default function EditQuestionnairePage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const templateId = Number(id);
  const isUseMode = searchParams.get("mode") === "use";
  const isCopyMode = searchParams.get("mode") === "copy";
  const router = useRouter();
  const [templateName, setTemplateName] = useState("");
  const [questions, setQuestions] = useState<EditableQuestion[]>([]);
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(true);
  const [purpose, setPurpose] = useState<QuestionnairePurpose>(DEFAULT_QUESTIONNAIRE_PURPOSE);
  const [canEdit, setCanEdit] = useState(true);
  const [answers, setAnswers] = useState<Record<number, string | number | boolean>>({});
  const [loaded, setLoaded] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const disallowTextQuestions = purpose === "CUSTOMISED_ALLOCATION";

  useEffect(() => {
    if (Number.isNaN(templateId)) return;

    const load = async () => {
      try {
        const template = await getQuestionnaireById(templateId);

        if (!template || !Array.isArray(template.questions)) {
          logDevError("Invalid questionnaire payload", template);
          return;
        }

        const baseName =
          typeof template.templateName === "string" ? template.templateName : "";
        const shouldDuplicate = isCopyMode || (isUseMode && !template.canEdit);
        setTemplateName(shouldDuplicate ? `${baseName} (Copy)` : baseName);
        const templateVisibility =
          typeof template.isPublic === "boolean" ? template.isPublic : true;
        setIsPublic(shouldDuplicate ? false : templateVisibility);
        setPurpose(normalizeQuestionnairePurpose(template.purpose));
        setCanEdit(typeof template.canEdit === "boolean" ? template.canEdit : true);

        setQuestions(
          template.questions.map((q) => ({
            uiId: Date.now() + Math.random(),
            id: q.id,
            dbId: q.id,
            label: q.label ?? "",
            type: q.type,
            configs: q.configs ?? {},
          }))
        );

        setLoaded(true);
      } catch (e) {
        logDevError(e);
      }
    };

    load();
  }, [templateId, isUseMode, isCopyMode]);

  const addQuestion = (type: QuestionType) => {
    if (disallowTextQuestions && type === "text") {
      return;
    }

    const q: EditableQuestion = {
      uiId: Date.now() + Math.random(),
      label: "",
      type,
      configs: {},
    };

    if (type === "multiple-choice") q.configs = { options: ["Yes", "No"] };
    if (type === "rating") q.configs = { min: 1, max: 10 };
    if (type === "slider") {
      q.configs = {
        min: 0,
        max: 100,
        step: 1,
        left: "Strongly disagree",
        right: "Strongly agree",
      };
    }

    setQuestions((qs) => [...qs, q]);
    setHasUnsavedChanges(true);
  };

  const validationErrors = useMemo(() => {
    if (preview) return [];

    const errors: string[] = [];

    if (!templateName.trim()) errors.push("Questionnaire name is required.");
    if (questions.length === 0) errors.push("At least one question is required.");

    questions.forEach((q, idx) => {
      if (!q.label.trim()) errors.push(`Question ${idx + 1} must have label.`);

      if (disallowTextQuestions && q.type === "text") {
        errors.push(`Question ${idx + 1} cannot be text for customised allocation questionnaires.`);
      }

      if (q.type === "multiple-choice") {
        const opts = (q.configs as MultipleChoiceConfigs | undefined)?.options ?? [];
        if (opts.length < 2) errors.push(`Question ${idx + 1} must have at least two options.`);
        if (opts.some((o: string) => !String(o ?? "").trim())) {
          errors.push(`Question ${idx + 1} has empty options.`);
        }
      }

      if (q.type === "slider") {
        const { min, max, step, left, right } = q.configs as SliderConfigs;
        if (typeof min !== "number" || typeof max !== "number") {
          errors.push(`Question ${idx + 1} slider min/max must be numbers.`);
        } else if (min >= max) {
          errors.push(`Question ${idx + 1} slider min must be less than max.`);
        }
        if (typeof step !== "number" || step <= 0) {
          errors.push(`Question ${idx + 1} slider step must be greater than zero.`);
        }
        if (!left || !right) errors.push(`Question ${idx + 1} slider labels are required.`);
      }
    });

    return errors;
  }, [disallowTextQuestions, templateName, questions, preview]);

  const isValid = validationErrors.length === 0;

  const saveTemplate = async () => {
    if (!isValid) return;

    setSaving(true);
    setSaveError(null);

    try {
      const shouldDuplicate = isCopyMode || (isUseMode && !canEdit);
      if (shouldDuplicate) {
        await createQuestionnaire({
          templateName,
          purpose,
          isPublic,
          questions: questions.map((q) => ({
            label: q.label,
            type: q.type,
            configs: q.configs,
          })),
        });
        setHasUnsavedChanges(false);
        router.push("/staff/questionnaires");
        return;
      }

      await updateQuestionnaire(templateId, {
        templateName,
        purpose,
        isPublic,
        questions: questions.map((q) => ({
          id: q.dbId,
          label: q.label,
          type: q.type,
          configs: q.configs,
        })),
      });

      setHasUnsavedChanges(false);
      router.back();
    } catch (err) {
      logDevError(err);
      setSaveError(err instanceof Error ? err.message : "Save failed. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (Number.isNaN(templateId)) return <p className="ui-note ui-note--muted ui-page">Invalid questionnaire ID</p>;
  if (!loaded) {
    return (
      <div className="ui-page" role="status" aria-live="polite">
        <SkeletonText lines={3} widths={["34%", "100%", "82%"]} />
        <span className="ui-visually-hidden">Loading…</span>
      </div>
    );
  }

  if (!canEdit && !isUseMode && !isCopyMode) {
    return (
      <div className="ui-page">
        <p className="ui-note ui-note--muted">You do not have permission to edit this questionnaire.</p>
        <Button type="button" variant="quiet" onClick={() => router.back()}>
          Back
        </Button>
      </div>
    );
  }

  return (
    <div className="questionnaire-editor">
      <h1>Edit questionnaire</h1>
      <p className="questionnaire-editor__hint">{preview ? "Student preview (not saved)" : "Editor mode"}</p>

      {!preview ? (
        <>
          <FormField
            subtle
            placeholder="Questionnaire name"
            value={templateName}
            onChange={(e) => {
              setTemplateName(e.target.value);
              setHasUnsavedChanges(true);
            }}
          />
          <QuestionnairePurposeButtons
            purpose={purpose}
            onChange={(nextPurpose) => {
              setPurpose(nextPurpose);
              setHasUnsavedChanges(true);
            }}
          />
          <QuestionnaireVisibilityButtons
            isPublic={isPublic}
            onChange={(next) => {
              setIsPublic(next);
              setHasUnsavedChanges(true);
            }}
          />
        </>
      ) : (
        <h2>{templateName ? templateName : "Please name your questionnaire"}</h2>
      )}

      <div className="questionnaire-editor__actions">
        <Button type="button" variant="quiet" onClick={() => setPreview((p) => !p)}>
          {preview ? "Back to editor" : "Student preview"}
        </Button>

        {!preview && (
          <>
            <Button
              type="button"
              onClick={saveTemplate}
              disabled={!isValid || saving}
            >
              {saving ? "Saving..." : "Save changes"}
            </Button>

            <CancelQuestionnaireButton
              onCancel={() => router.back()}
              confirmWhen={hasUnsavedChanges}
            />
          </>
        )}
      </div>

      {!preview && !isValid && (
        <ul className="questionnaire-editor__errors">
          {validationErrors.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      )}
      {saveError ? <p className="ui-note ui-note--error">{saveError}</p> : null}

      <EditQuestionnaireQuestionList
        questions={questions}
        preview={preview}
        answers={answers}
        setAnswers={setAnswers}
        setQuestions={setQuestions}
        setHasUnsavedChanges={setHasUnsavedChanges}
        disallowTextQuestions={disallowTextQuestions}
        addQuestion={addQuestion}
      />
    </div>
  );
}
