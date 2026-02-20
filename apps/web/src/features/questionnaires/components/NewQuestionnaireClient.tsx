"use client";

import { useMemo, useState } from "react";
import type {
  EditableQuestion,
  MultipleChoiceConfigs,
  QuestionType,
  SliderConfigs,
} from "@/features/questionnaires/types";
import { apiFetch } from "@/shared/api/http";
import { useRouter } from "next/navigation";

const styles = {
  page: { padding: 32, maxWidth: 900 },
  hint: { opacity: 0.75 },
  input: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid var(--border)",
    background: "var(--glass-surface)",
    color: "var(--ink)",
    WebkitTextFillColor: "var(--ink)",
    outline: "none",
  } as React.CSSProperties,
  card: {
    marginTop: 20,
    padding: 16,
    border: "1px solid var(--border)",
    borderRadius: 14,
    background: "var(--surface)",
    boxShadow: "var(--shadow-sm)",
  } as React.CSSProperties,
  row: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" } as React.CSSProperties,
  btnRow: { marginTop: 16, display: "flex", gap: 8, alignItems: "center" } as React.CSSProperties,
  btn: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid var(--border)",
    background: "var(--glass-hover)",
    color: "var(--ink)",
    cursor: "pointer",
  } as React.CSSProperties,
  btnPrimary: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid var(--btn-primary-border)",
    background: "var(--btn-primary-bg)",
    color: "var(--btn-primary-text)",
    cursor: "pointer",
  } as React.CSSProperties,

  errors: { marginTop: 12, color: "var(--accent-warm)", fontSize: 14 } as React.CSSProperties,
  success: { marginTop: 12, color: "var(--accent)", fontSize: 14 } as React.CSSProperties,
  small: { fontSize: 12, opacity: 0.75 } as React.CSSProperties,
};

export default function NewQuestionnairePage() {
  const router = useRouter();
  const [templateName, setTemplateName] = useState("");
  const [questions, setQuestions] = useState<EditableQuestion[]>([]);
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [answers, setAnswers] = useState<Record<number, string | number | boolean>>({});

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
  }, [templateName, questions]);

  const isValid = validationErrors.length === 0;

  const saveTemplate = async () => {
    if (!isValid) return;

    setSaving(true);
    setSaved(false);

    try {
      await apiFetch("/questionnaires/new", {
        method: "POST",
        body: JSON.stringify({
          templateName,
          questions: questions.map((q) => ({
            label: q.label,
            type: q.type,
            configs: q.configs,
          })),
        }),
      });

      setTemplateName("");
      setQuestions([]);
      setPreview(false);
      setAnswers({});
      setSaved(true);
      router.push("/staff/questionnaires");
    } catch (err) {
      console.error(err);
      alert("Save failed — check console");
    } finally {
      setSaving(false);
      
    }
  };

  return (
    <div style={styles.page}>
      <h1 style={{ marginBottom: 6 }}>Create questionnaire</h1>
      <p style={styles.hint}>{preview ? "Student preview (not saved)" : "Editor mode"}</p>

      {!preview && (
        <input
          placeholder="Questionnaire name"
          value={templateName}
          onChange={(e) => setTemplateName(e.target.value)}
          style={styles.input}
        />
      )}

      <div style={styles.btnRow}>
        <button style={styles.btn} onClick={() => setPreview((p) => !p)}>
          {preview ? "Back to editor" : "Student preview"}
        </button>

        {!preview && (
          <button
            style={{
              ...styles.btnPrimary,
              opacity: !isValid || saving ? 0.6 : 1,
              cursor: !isValid || saving ? "not-allowed" : "pointer",
            }}
            onClick={saveTemplate}
            disabled={!isValid || saving}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        )}
      </div>

      {!preview && !isValid && (
        <ul style={styles.errors}>
          {validationErrors.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      )}

      {saved && <p style={styles.success}>Questionnaire saved successfully.</p>}

      {questions.map((q, i) => (
        <div key={q.uiId} style={styles.card}>
          <div style={styles.row}>
            <strong>
              {i + 1}.
               {!preview && ` ${q.type}`}
            </strong>

            {!preview && (
              <button
                style={styles.btn}
                onClick={() => setQuestions((qs) => qs.filter((x) => x.uiId !== q.uiId))}
              >
                Remove
              </button>
            )}
          </div>

          {preview ? (
            <>
              <strong style={{ display: "block", marginTop: 10 }}>
                {q.label || "Untitled question"}
              </strong>

              {q.type === "slider" && (q.configs as SliderConfigs | undefined)?.helperText && (
                <p style={{ marginTop: 6, ...styles.small }}>
                  {(q.configs as SliderConfigs).helperText}
                </p>
              )}

              {q.type === "text" && (
                <input
                  style={{ ...styles.input, marginTop: 10 }}
                  value={answers[q.uiId] || ""}
                  onChange={(e) => setAnswers((a) => ({ ...a, [q.uiId]: e.target.value }))}
                />
              )}

              {q.type === "multiple-choice" &&
                ((q.configs as MultipleChoiceConfigs | undefined)?.options ?? []).map((o: string) => (
                  <label key={o} style={{ display: "block", marginTop: 8 }}>
                    <input
                      type="radio"
                      checked={answers[q.uiId] === o}
                      onChange={() => setAnswers((a) => ({ ...a, [q.uiId]: o }))}
                    />{" "}
                    {o}
                  </label>
                ))}

              {q.type === "rating" && (
                <div style={{ display: "flex", gap: 14, marginTop: 10, flexWrap: "wrap" }}>
                  {Array.from({ length: 10 }, (_, n) => n + 1).map((n) => (
                    <label key={n} style={{ fontSize: 12 }}>
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
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, ...styles.small }}>
                    <span>{(q.configs as SliderConfigs | undefined)?.left}</span>
                    <span>{(q.configs as SliderConfigs | undefined)?.right}</span>
                  </div>

                  <input
                    type="range"
                    min={(q.configs as SliderConfigs | undefined)?.min}
                    max={(q.configs as SliderConfigs | undefined)?.max}
                    step={(q.configs as SliderConfigs | undefined)?.step}
                    value={answers[q.uiId] ?? (q.configs as SliderConfigs | undefined)?.min ?? 0}
                    onChange={(e) =>
                      setAnswers((a) => ({ ...a, [q.uiId]: Number(e.target.value) }))
                    }
                    style={{ width: "100%", marginTop: 8 }}
                  />

                  <div style={styles.small}>
                    Selected: {answers[q.uiId] ?? (q.configs as SliderConfigs | undefined)?.min ?? 0}
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              <input
                placeholder="Question label"
                value={q.label}
                onChange={(e) =>
                  setQuestions((qs) =>
                    qs.map((x) => (x.uiId === q.uiId ? { ...x, label: e.target.value } : x))
                  )
                }
                style={{ ...styles.input, marginTop: 10 }}
              />

              {q.type === "slider" && (
                <input
                  placeholder="Helper text shown to students"
                  value={(q.configs as SliderConfigs | undefined)?.helperText ?? ""}
                  onChange={(e) =>
                    setQuestions((qs) =>
                      qs.map((x) =>
                        x.uiId === q.uiId
                          ? { ...x, configs: { ...x.configs, helperText: e.target.value } }
                          : x
                      )
                    )
                  }
                  style={{ ...styles.input, marginTop: 8, opacity: 0.9 }}
                />
              )}

              {q.type === "multiple-choice" &&
                ((q.configs as MultipleChoiceConfigs | undefined)?.options ?? []).map((o: string, idx: number) => (
                  <div key={idx} style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <input
                      value={o}
                      onChange={(e) =>
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
                        )
                      }
                      style={{ ...styles.input, flex: 1 }}
                    />

                    <button
                      style={styles.btn}
                      onClick={() =>
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
                        )
                      }
                    >
                      ✕
                    </button>
                  </div>
                ))}

              {q.type === "multiple-choice" && (
                <button
                  style={{ ...styles.btn, marginTop: 10 }}
                  onClick={() =>
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
                    )
                  }
                >
                  Add option
                </button>
              )}
            </>
          )}
        </div>
      ))}

      {!preview && (
        <div style={{ marginTop: 20, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button style={styles.btn} onClick={() => addQuestion("text")}>
            Add text
          </button>
          <button style={styles.btn} onClick={() => addQuestion("multiple-choice")}>
            Add multiple choice
          </button>
          <button style={styles.btn} onClick={() => addQuestion("rating")}>
            Add rating
          </button>
          <button style={styles.btn} onClick={() => addQuestion("slider")}>
            Add slider
          </button>
        </div>
      )}
    </div>
  );
}
