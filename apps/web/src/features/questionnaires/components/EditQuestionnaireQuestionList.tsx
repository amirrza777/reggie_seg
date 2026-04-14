"use client";

import type { Dispatch, SetStateAction } from "react";
import { Button } from "@/shared/ui/Button";
import { FormField } from "@/shared/ui/FormField";
import {
  QUESTION_LABEL_MAX_LENGTH,
  type EditableQuestion,
  type MultipleChoiceConfigs,
  type SliderConfigs,
} from "@/features/questionnaires/types";

type Props = {
  questions: EditableQuestion[];
  preview: boolean;
  answers: Record<number, string | number | boolean>;
  setAnswers: Dispatch<SetStateAction<Record<number, string | number | boolean>>>;
  setQuestions: Dispatch<SetStateAction<EditableQuestion[]>>;
  setHasUnsavedChanges: Dispatch<SetStateAction<boolean>>;
  disallowTextQuestions: boolean;
  addQuestion: (type: "text" | "multiple-choice" | "rating" | "slider") => void;
};

export function EditQuestionnaireQuestionList({
  questions,
  preview,
  answers,
  setAnswers,
  setQuestions,
  setHasUnsavedChanges,
  disallowTextQuestions,
  addQuestion,
}: Props) {
  return (
    <>
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
                maxLength={QUESTION_LABEL_MAX_LENGTH}
                onChange={(e) => {
                  const label = e.target.value.slice(0, QUESTION_LABEL_MAX_LENGTH);
                  setQuestions((qs) => qs.map((x) => (x.uiId === q.uiId ? { ...x, label } : x)));
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
                <p className="questionnaire-editor__helper">{(q.configs as SliderConfigs).helperText}</p>
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
                        x.uiId === q.uiId ? { ...x, configs: { ...x.configs, helperText: e.target.value } } : x,
                      ),
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
                                        i === idx ? e.target.value : opt,
                                      ),
                                    },
                                  }
                                : x,
                            ),
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
                                        (_: string, i: number) => i !== idx,
                                      ),
                                    },
                                  }
                                : x,
                            ),
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
                                options: [...((x.configs as MultipleChoiceConfigs).options ?? []), "New option"],
                              },
                            }
                          : x,
                      ),
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
          {!disallowTextQuestions ? (
            <Button type="button" variant="quiet" onClick={() => addQuestion("text")}>
              Add text
            </Button>
          ) : null}
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
    </>
  );
}
