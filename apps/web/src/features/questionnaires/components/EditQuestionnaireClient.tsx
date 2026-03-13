"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/shared/ui/Button";
import { FormField } from "@/shared/ui/FormField";
import type {
  EditableQuestion,
  MultipleChoiceConfigs,
  QuestionType,
  SliderConfigs,
} from "@/features/questionnaires/types";
import { createQuestionnaire, getQuestionnaireById, updateQuestionnaire } from "../api/client";
import {
  CancelQuestionnaireButton,
  QuestionnaireVisibilityButtons,
} from "./SharedQuestionnaireButtons";

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
  const [isPublic, setIsPublic] = useState(true);
  const [canEdit, setCanEdit] = useState(true);
  const [answers, setAnswers] = useState<Record<number, string | number | boolean>>({});
  const [loaded, setLoaded] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    if (Number.isNaN(templateId)) return;

    const load = async () => {
      try {
        const template = await getQuestionnaireById(templateId);

        if (!template || !Array.isArray(template.questions)) {
          console.error("Invalid questionnaire payload", template);
          return;
        }

        const baseName =
          typeof template.templateName === "string" ? template.templateName : "";
        const shouldDuplicate = isCopyMode || (isUseMode && !template.canEdit);
        setTemplateName(shouldDuplicate ? `${baseName} (Copy)` : baseName);
        const templateVisibility =
          typeof template.isPublic === "boolean" ? template.isPublic : true;
        setIsPublic(shouldDuplicate ? false : templateVisibility);
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
        console.error(e);
      }
    };

    load();
  }, [templateId, isUseMode, isCopyMode]);

  const addQuestion = (type: QuestionType) => {
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
  }, [templateName, questions, preview]);

  const isValid = validationErrors.length === 0;

  const saveTemplate = async () => {
    if (!isValid) return;

    setSaving(true);

    try {
      const shouldDuplicate = isCopyMode || (isUseMode && !canEdit);
      if (shouldDuplicate) {
        await createQuestionnaire({
          templateName,
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
      console.error(err);
      alert("Save failed — check console");
    } finally {
      setSaving(false);
    }
  };

  if (Number.isNaN(templateId)) return <p className="ui-note ui-note--muted ui-page">Invalid questionnaire ID</p>;
  if (!loaded) return <p className="ui-note ui-note--muted ui-page">Loading…</p>;

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

      {questions.map((q, i) => (
        <article key={q.uiId} className="questionnaire-editor__question">
          {!preview && <div className="questionnaire-editor__question-type">{q.type}</div>}

          <div className="questionnaire-editor__question-row">
            <strong>{i + 1}.</strong>

            {!preview ? (
              <FormField
                subtle
                className="questionnaire-editor__question-main"
                placeholder="Enter your question"
                value={q.label}
                onChange={(e) => {
                  setQuestions((qs) =>
                    qs.map((x) => (x.uiId === q.uiId ? { ...x, label: e.target.value } : x))
                  );
                  setHasUnsavedChanges(true);
                }}
              />
            ) : (
              <div className="questionnaire-editor__question-main">
                <strong>{q.label || "Untitled question"}</strong>
              </div>
            )}

            {!preview && (
              <Button
                type="button"
                size="sm"
                variant="quiet"
                onClick={() => {
                  setQuestions((qs) => qs.filter((x) => x.uiId !== q.uiId));
                  setHasUnsavedChanges(true);
                }}
              >
                Remove
              </Button>
            )}
          </div>

          {preview ? (
            <>
              {q.type === "slider" && (q.configs as SliderConfigs | undefined)?.helperText && (
                <p className="questionnaire-editor__helper">
                  {(q.configs as SliderConfigs).helperText}
                </p>
              )}

              {q.type === "text" && (
                <FormField
                  subtle
                  value={String(answers[q.uiId] ?? "")}
                  onChange={(e) => setAnswers((a) => ({ ...a, [q.uiId]: e.target.value }))}
                />
              )}

              {q.type === "multiple-choice" && (
                <div className="questionnaire-editor__choices">
                  {((q.configs as MultipleChoiceConfigs | undefined)?.options ?? []).map((o: string) => (
                    <label key={o}>
                      <input
                        type="radio"
                        checked={answers[q.uiId] === o}
                        onChange={() => setAnswers((a) => ({ ...a, [q.uiId]: o }))}
                      />{" "}
                      {o}
                    </label>
                  ))}
                </div>
              )}

              {q.type === "rating" && (
                <div className="questionnaire-editor__radio-grid">
                  {Array.from({ length: 10 }, (_, n) => n + 1).map((n) => (
                    <label key={n} className="questionnaire-editor__radio-option">
                      <input
                        type="radio"
                        checked={answers[q.uiId] === n}
                        onChange={() => setAnswers((a) => ({ ...a, [q.uiId]: n }))}
                      />{" "}
                      {n}
                    </label>
                  ))}
                </div>
              )}

              {q.type === "slider" && (
                <>
                  <div className="questionnaire-editor__slider-meta">
                    <span>{(q.configs as SliderConfigs | undefined)?.left}</span>
                    <span>{(q.configs as SliderConfigs | undefined)?.right}</span>
                  </div>

                  <input
                    className="questionnaire-editor__range"
                    type="range"
                    min={(q.configs as SliderConfigs | undefined)?.min}
                    max={(q.configs as SliderConfigs | undefined)?.max}
                    step={(q.configs as SliderConfigs | undefined)?.step}
                    value={Number(answers[q.uiId] ?? (q.configs as SliderConfigs | undefined)?.min ?? 0)}
                    onChange={(e) => {
                      setAnswers((a) => ({ ...a, [q.uiId]: Number(e.target.value) }));
                    }}
                  />

                  <p className="questionnaire-editor__helper">
                    Selected: {answers[q.uiId] ?? (q.configs as SliderConfigs | undefined)?.min ?? 0}
                  </p>
                </>
              )}
            </>
          ) : (
            <>
              {q.type === "slider" && (
                <FormField
                  subtle
                  placeholder="Helper text shown to students"
                  value={(q.configs as SliderConfigs | undefined)?.helperText ?? ""}
                  onChange={(e) => {
                    setQuestions((qs) =>
                      qs.map((x) =>
                        x.uiId === q.uiId
                          ? { ...x, configs: { ...x.configs, helperText: e.target.value } }
                          : x
                      )
                    );
                    setHasUnsavedChanges(true);
                  }}
                />
              )}

              {q.type === "multiple-choice" && (
                <div className="questionnaire-editor__choices">
                  {((q.configs as MultipleChoiceConfigs | undefined)?.options ?? []).map((o: string, idx: number) => (
                    <div key={idx} className="questionnaire-editor__choice-row">
                      <FormField
                        subtle
                        value={o}
                        onChange={(e) => {
                          setQuestions((qs) =>
                            qs.map((x) =>
                              x.uiId === q.uiId
                                ? {
                                    ...x,
                                    configs: {
                                      ...x.configs,
                                      options: (x.configs as MultipleChoiceConfigs).options.map((opt: string, i: number) =>
                                        i === idx ? e.target.value : opt
                                      ),
                                    },
                                  }
                                : x
                            )
                          );
                          setHasUnsavedChanges(true);
                        }}
                      />

                      <Button
                        type="button"
                        size="sm"
                        variant="quiet"
                        onClick={() => {
                          setQuestions((qs) =>
                            qs.map((x) =>
                              x.uiId === q.uiId
                                ? {
                                    ...x,
                                    configs: {
                                      ...x.configs,
                                      options: (x.configs as MultipleChoiceConfigs).options.filter(
                                        (_: string, i: number) => i !== idx
                                      ),
                                    },
                                  }
                                : x
                            )
                          );
                          setHasUnsavedChanges(true);
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {q.type === "multiple-choice" && (
                <Button
                  type="button"
                  size="sm"
                  variant="quiet"
                  onClick={() => {
                    setQuestions((qs) =>
                      qs.map((x) =>
                        x.uiId === q.uiId
                          ? {
                              ...x,
                              configs: {
                                ...x.configs,
                                options: [
                                  ...((x.configs as MultipleChoiceConfigs).options ?? []),
                                  "New option",
                                ],
                              },
                            }
                          : x
                      )
                    );
                    setHasUnsavedChanges(true);
                  }}
                >
                  Add option
                </Button>
              )}
            </>
          )}
        </article>
      ))}

      {!preview && (
        <div className="questionnaire-editor__add-row">
          <Button type="button" variant="quiet" onClick={() => addQuestion("text")}>
            Add text
          </Button>
          <Button type="button" variant="quiet" onClick={() => addQuestion("multiple-choice")}>
            Add multiple choice
          </Button>
          <Button type="button" variant="quiet" onClick={() => addQuestion("rating")}>
            Add rating
          </Button>
          <Button type="button" variant="quiet" onClick={() => addQuestion("slider")}>
            Add slider
          </Button>
        </div>
      )}
    </div>
  );
}

