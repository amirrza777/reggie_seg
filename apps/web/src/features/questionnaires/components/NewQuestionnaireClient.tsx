"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/ui/Button";
import { logDevError } from "@/shared/lib/devLogger";
import { FormField } from "@/shared/ui/FormField";
import type {
  EditableQuestion,
  MultipleChoiceConfigs,
  QuestionnairePurpose,
  QuestionType,
  SliderConfigs,
} from "@/features/questionnaires/types";
import { createQuestionnaire } from "../api/client";
import {
  DEFAULT_QUESTIONNAIRE_PURPOSE,
  normalizeQuestionnairePurpose,
} from "../purpose";
import {
  CancelQuestionnaireButton,
  QuestionnairePurposeButtons,
  QuestionnaireVisibilityButtons,
} from "./SharedQuestionnaireButtons";
import { NewQuestionnaireQuestionList } from "./NewQuestionnaireQuestionList";

export default function NewQuestionnairePage() {
  const router = useRouter();
  const [templateName, setTemplateName] = useState("");
  const [questions, setQuestions] = useState<EditableQuestion[]>([]);
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(false);
  const [initialPurpose, setInitialPurpose] = useState<QuestionnairePurpose>(
    DEFAULT_QUESTIONNAIRE_PURPOSE,
  );
  const [purpose, setPurpose] = useState<QuestionnairePurpose>(DEFAULT_QUESTIONNAIRE_PURPOSE);
  const [answers, setAnswers] = useState<Record<number, string | number | boolean>>({});
  const disallowTextQuestions = purpose === "CUSTOMISED_ALLOCATION";

  useEffect(() => {
    const parsedPurpose = normalizeQuestionnairePurpose(
      new URLSearchParams(window.location.search).get("purpose"),
    );
    setInitialPurpose(parsedPurpose);
    setPurpose(parsedPurpose);
  }, []);

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
        helperText:
          "To what extent do you agree with the above statement? (helper text shown to students)",
      };
    }

    setQuestions((qs) => [...qs, q]);
    setSaved(false);
  };

  const validationErrors = useMemo(() => {
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
          errors.push(`Question ${idx + 1} has empty multiple-choice options.`);
        }
      }

      if (q.type === "slider") {
        const { min, max, step, left, right } = (q.configs as SliderConfigs | undefined) ?? {};
        if (typeof min !== "number" || typeof max !== "number") {
          errors.push(`Question ${idx + 1} slider min/max must be numbers.`);
        } else if (min >= max) {
          errors.push(`Question ${idx + 1} slider min must be less than max.`);
        }
        if (typeof step !== "number" || step <= 0) {
          errors.push(`Question ${idx + 1} slider step must be greater than zero.`);
        }
        if (!left || !right) errors.push(`Question ${idx + 1} slider must have left and right labels.`);
      }
    });

    return errors;
  }, [disallowTextQuestions, templateName, questions]);

  const isValid = validationErrors.length === 0;
  const hasUnsavedChanges =
    Boolean(templateName.trim()) ||
    questions.length > 0 ||
    isPublic ||
    purpose !== initialPurpose;

  const saveTemplate = async () => {
    if (!isValid) return;

    setSaving(true);
    setSaved(false);
    setSaveError(null);

    try {
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

      setTemplateName("");
      setQuestions([]);
      setPreview(false);
      setIsPublic(false);
      setPurpose(initialPurpose);
      setAnswers({});
      setSaved(true);
      router.push("/staff/questionnaires");
    } catch (err) {
      logDevError(err);
      setSaveError(err instanceof Error ? err.message : "Save failed. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="questionnaire-editor">
      <h1>Create questionnaire</h1>
      <p className="questionnaire-editor__hint">{preview ? "Student preview (not saved)" : "Editor mode"}</p>

      {!preview && (
        <>
          <FormField
            subtle
            placeholder="Questionnaire name"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
          />
          <QuestionnairePurposeButtons
            purpose={purpose}
            onChange={(nextPurpose) => {
              setPurpose(nextPurpose);
              setSaved(false);
            }}
          />
          <QuestionnaireVisibilityButtons
            isPublic={isPublic}
            onChange={setIsPublic}
          />
        </>
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
              {saving ? "Saving..." : "Save"}
            </Button>
            <CancelQuestionnaireButton
              onCancel={() => router.push("/staff/questionnaires")}
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

      {saved && <p className="questionnaire-editor__success">Questionnaire saved successfully.</p>}

      <NewQuestionnaireQuestionList
        questions={questions}
        preview={preview}
        answers={answers}
        setAnswers={setAnswers}
        setQuestions={setQuestions}
        disallowTextQuestions={disallowTextQuestions}
        addQuestion={addQuestion}
      />
    </div>
  );
}
