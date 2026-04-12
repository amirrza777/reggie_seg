"use client";

import type { Dispatch, SetStateAction } from "react";
import { Button } from "@/shared/ui/Button";
import { FormField } from "@/shared/ui/FormField";
import type {
  EditableQuestion,
  MultipleChoiceConfigs,
  SliderConfigs,
  QuestionType,
} from "@/features/questionnaires/types";

type EditQuestionnaireQuestionsProps = {
  preview: boolean;
  questions: EditableQuestion[];
  answers: Record<number, string | number | boolean>;
  disallowTextQuestions: boolean;
  setAnswers: Dispatch<SetStateAction<Record<number, string | number | boolean>>>;
  setQuestions: Dispatch<SetStateAction<EditableQuestion[]>>;
  setHasUnsavedChanges: Dispatch<SetStateAction<boolean>>;
  addQuestion: (type: QuestionType) => void;
};

export function EditQuestionnaireQuestions({
  preview,
  questions,
  answers,
  disallowTextQuestions,
  setAnswers,
  setQuestions,
  setHasUnsavedChanges,
  addQuestion,
}: EditQuestionnaireQuestionsProps) {
  const updateQuestion = (uiId: number, updater: (question: EditableQuestion) => EditableQuestion) => {
    setQuestions((existingQuestions) =>
      existingQuestions.map((question) => (question.uiId === uiId ? updater(question) : question)),
    );
    setHasUnsavedChanges(true);
  };

  return (
    <>
      {questions.map((q, i) => (
        <article key={q.uiId} className="questionnaire-editor__question">
          {!preview ? <div className="questionnaire-editor__question-type">{q.type}</div> : null}

          <div className="questionnaire-editor__question-row">
            <strong>{i + 1}.</strong>

            {!preview ? (
              <FormField
                subtle
                className="questionnaire-editor__question-main"
                placeholder="Enter your question"
                value={q.label}
                onChange={(e) => updateQuestion(q.uiId, (question) => ({ ...question, label: e.target.value }))}
              />
            ) : (
              <div className="questionnaire-editor__question-main">
                <strong>{q.label || "Untitled question"}</strong>
              </div>
            )}

            {!preview ? (
              <Button
                type="button"
                size="sm"
                variant="quiet"
                onClick={() => {
                  setQuestions((existingQuestions) => existingQuestions.filter((question) => question.uiId !== q.uiId));
                  setHasUnsavedChanges(true);
                }}
              >
                Remove
              </Button>
            ) : null}
          </div>

          {preview ? (
            <PreviewQuestion
              question={q}
              answer={answers[q.uiId]}
              onAnswerChange={(value) => setAnswers((existingAnswers) => ({ ...existingAnswers, [q.uiId]: value }))}
            />
          ) : (
            <EditableQuestionFields question={q} onUpdateQuestion={updateQuestion} />
          )}
        </article>
      ))}

      {!preview ? (
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
      ) : null}
    </>
  );
}

function PreviewQuestion({
  question,
  answer,
  onAnswerChange,
}: {
  question: EditableQuestion;
  answer: string | number | boolean | undefined;
  onAnswerChange: (value: string | number) => void;
}) {
  const sliderConfig = question.configs as SliderConfigs | undefined;
  const multipleChoiceConfig = question.configs as MultipleChoiceConfigs | undefined;

  return (
    <>
      {question.type === "slider" && sliderConfig?.helperText ? (
        <p className="questionnaire-editor__helper">{sliderConfig.helperText}</p>
      ) : null}

      {question.type === "text" ? (
        <FormField subtle value={String(answer ?? "")} onChange={(e) => onAnswerChange(e.target.value)} />
      ) : null}

      {question.type === "multiple-choice" ? (
        <div className="questionnaire-editor__choices">
          {(multipleChoiceConfig?.options ?? []).map((option: string) => (
            <label key={option}>
              <input type="radio" checked={answer === option} onChange={() => onAnswerChange(option)} /> {option}
            </label>
          ))}
        </div>
      ) : null}

      {question.type === "rating" ? (
        <div className="questionnaire-editor__radio-grid">
          {Array.from({ length: 10 }, (_, n) => n + 1).map((n) => (
            <label key={n} className="questionnaire-editor__radio-option">
              <input type="radio" checked={answer === n} onChange={() => onAnswerChange(n)} /> {n}
            </label>
          ))}
        </div>
      ) : null}

      {question.type === "slider" ? (
        <>
          <div className="questionnaire-editor__slider-meta">
            <span>{sliderConfig?.left}</span>
            <span>{sliderConfig?.right}</span>
          </div>

          <input
            className="questionnaire-editor__range"
            type="range"
            min={sliderConfig?.min}
            max={sliderConfig?.max}
            step={sliderConfig?.step}
            value={Number(answer ?? sliderConfig?.min ?? 0)}
            onChange={(e) => onAnswerChange(Number(e.target.value))}
          />

          <p className="questionnaire-editor__helper">Selected: {answer ?? sliderConfig?.min ?? 0}</p>
        </>
      ) : null}
    </>
  );
}

function EditableQuestionFields({
  question,
  onUpdateQuestion,
}: {
  question: EditableQuestion;
  onUpdateQuestion: (uiId: number, updater: (question: EditableQuestion) => EditableQuestion) => void;
}) {
  const sliderConfig = question.configs as SliderConfigs | undefined;
  const multipleChoiceOptions = ((question.configs as MultipleChoiceConfigs | undefined)?.options ?? []) as string[];

  return (
    <>
      {question.type === "slider" ? (
        <FormField
          subtle
          placeholder="Helper text shown to students"
          value={sliderConfig?.helperText ?? ""}
          onChange={(e) =>
            onUpdateQuestion(question.uiId, (existingQuestion) => ({
              ...existingQuestion,
              configs: { ...existingQuestion.configs, helperText: e.target.value },
            }))
          }
        />
      ) : null}

      {question.type === "multiple-choice" ? (
        <div className="questionnaire-editor__choices">
          {multipleChoiceOptions.map((option: string, optionIndex: number) => (
            <div key={optionIndex} className="questionnaire-editor__choice-row">
              <FormField
                subtle
                value={option}
                onChange={(e) =>
                  onUpdateQuestion(question.uiId, (existingQuestion) => {
                    const existingOptions = ((existingQuestion.configs as MultipleChoiceConfigs).options ?? []) as string[];
                    return {
                      ...existingQuestion,
                      configs: {
                        ...existingQuestion.configs,
                        options: existingOptions.map((existingOption: string, index: number) =>
                          index === optionIndex ? e.target.value : existingOption,
                        ),
                      },
                    };
                  })
                }
              />

              <Button
                type="button"
                size="sm"
                variant="quiet"
                onClick={() =>
                  onUpdateQuestion(question.uiId, (existingQuestion) => {
                    const existingOptions = ((existingQuestion.configs as MultipleChoiceConfigs).options ?? []) as string[];
                    return {
                      ...existingQuestion,
                      configs: {
                        ...existingQuestion.configs,
                        options: existingOptions.filter((_: string, index: number) => index !== optionIndex),
                      },
                    };
                  })
                }
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
      ) : null}

      {question.type === "multiple-choice" ? (
        <Button
          type="button"
          size="sm"
          variant="quiet"
          onClick={() =>
            onUpdateQuestion(question.uiId, (existingQuestion) => {
              const existingOptions = ((existingQuestion.configs as MultipleChoiceConfigs).options ?? []) as string[];
              return {
                ...existingQuestion,
                configs: {
                  ...existingQuestion.configs,
                  options: [...existingOptions, "New option"],
                },
              };
            })
          }
        >
          Add option
        </Button>
      ) : null}
    </>
  );
}
