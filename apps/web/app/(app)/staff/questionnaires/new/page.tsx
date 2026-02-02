"use client";
import { useMemo, useState } from "react";

type QuestionType = "text" | "multiple-choice" | "rating" | "slider";
type Question = {
  uiId: number;
  text: string;
  type: QuestionType;
  configs: any;
};
const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.25)",
  background: "rgba(0,0,0,0.25)",
  color: "#fff",
  WebkitTextFillColor: "#fff",
};

export default function NewQuestionnairePage() {
  const [templateName, setTemplateName] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [saved, setSaved] = useState(false);

  const addQuestion = (type: QuestionType) => {
    const q: Question = {
      uiId: Date.now() + Math.random(),
      text: "",
      type,
      configs: {},
    };

    if (type === "multiple-choice") q.configs = { options: ["Yes", "No"] };
    if (type === "rating") q.configs = { min: 1, max: 10 };
    if (type === "slider")
      q.configs = {
        min: 0,
        max: 100,
        step: 1,
        left: "Strongly disagree",
        right: "Strongly agree",
        helperText: "To what extent do you agree with the above statement? (helper text shown to students)",
      };
      // give students some needed context
    setQuestions(qs => [...qs, q]);
  };

  // validation checks

  const validationErrors = useMemo(() => {
    const errors: string[] = [];

    if (!templateName.trim()) errors.push("Questionnaire name is required.");
    if (questions.length === 0) errors.push("At least one question is required.");
    questions.forEach((q, idx) => {
      if (!q.text.trim()) {
        errors.push(`Question ${idx + 1} must have text.`);
      }

      if (q.type === "multiple-choice") {
        const opts = q.configs.options ?? [];
        if (opts.length < 2) {
          errors.push(`Question ${idx + 1} must have at least two options.`);
        }
        if (opts.some((o: string) => !o.trim())) {
          errors.push(`Question ${idx + 1} has empty multiple-choice options.`);
        }
      }
      if (q.type === "slider") {
        const { min, max, step, left, right } = q.configs;
        if (min >= max) errors.push(`Question ${idx + 1} slider min must be less than max.`);
        if (step <= 0) errors.push(`Question ${idx + 1} slider step must be greater than zero.`);
        if (!left || !right)
          errors.push(`Question ${idx + 1} slider must have left and right labels.`);
      }
    });

    return errors;
  }, [templateName, questions]);
  const isValid = validationErrors.length === 0;

  // save logic

  const saveTemplate = async () => {
    if (!isValid) return;
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/questionnaires/new`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            templateName,
            questions: questions.map(q => ({
              text: q.text,
              type: q.type,
              configs: q.configs,
            })),
          }),
        }
      );

      if (!res.ok) throw new Error(await res.text());
      setTemplateName("");
      setQuestions([]);
      setPreview(false);
      setAnswers({});
      setSaved(true);
    } catch (err) {
      console.error(err);
      alert("Save failed — check console");
    } finally {
      setSaving(false);
    }
  };
  return (
    <div style={{ padding: 32, maxWidth: 900 }}>
      <h1>Create questionnaire</h1>
      <p style={{ opacity: 0.7 }}>
        {preview ? "Student preview (not saved)" : "Editor mode"}
      </p>

      {!preview && (
        <input
          placeholder="Questionnaire name"
          value={templateName}
          onChange={(e) => setTemplateName(e.target.value)}
          style={inputStyle}
        />
      )}

      <div style={{ marginTop: 16 }}>
        <button onClick={() => setPreview(p => !p)}>
          {preview ? "Back to editor" : "Student preview"}
        </button>
        {!preview && (
          <button
            onClick={saveTemplate}
            disabled={!isValid || saving}
            style={{ marginLeft: 8, opacity: !isValid ? 0.5 : 1 }}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        )}
      </div>

      {!isValid && !preview && (
        <ul style={{ marginTop: 12, color: "#ffb3b3", fontSize: 14 }}>
          {validationErrors.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      )}

      {saved && (
        <p style={{ marginTop: 12, color: "#8fff8f" }}>
          Questionnaire saved successfully.
        </p>
      )}

      {questions.map((q, i) => (
        <div
          key={q.uiId}
          style={{
            marginTop: 20,
            padding: 16,
            border: "1px solid rgba(255,255,255,0.25)",
            borderRadius: 10,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <strong>{i + 1}. {q.type}</strong>
            {!preview && (
              <button onClick={() =>
                setQuestions(qs => qs.filter(x => x.uiId !== q.uiId))
              }>
                Remove
              </button>
            )}
          </div>
          {preview && (
            <>
              <strong style={{ display: "block", marginTop: 8 }}>
                {q.text || "Untitled question"}
              </strong>

              {q.type === "slider" && q.configs.helperText && (
                <p style={{ fontSize: 13, opacity: 0.75, marginTop: 4 }}>
                  {q.configs.helperText}
                </p>
              )}

              {q.type === "text" && (
                <input
                  style={{ ...inputStyle, marginTop: 8 }}
                  value={answers[q.uiId] || ""}
                  onChange={(e) =>
                    setAnswers(a => ({ ...a, [q.uiId]: e.target.value }))
                  }
                />
              )}

              {q.type === "multiple-choice" &&
                q.configs.options.map((o: string) => (
                  <label key={o} style={{ display: "block", marginTop: 6 }}>
                    <input
                      type="radio"
                      checked={answers[q.uiId] === o}
                      onChange={() =>
                        setAnswers(a => ({ ...a, [q.uiId]: o }))
                      }
                    />{" "}
                    {o}
                  </label>
                ))}

              {q.type === "rating" && (
                <div style={{ display: "flex", gap: 14, marginTop: 8 }}>
                  {Array.from({ length: 10 }, (_, n) => n + 1).map(n => (
                    <label key={n} style={{ fontSize: 12 }}>
                      <input
                        type="radio"
                        checked={answers[q.uiId] === n}
                        onChange={() =>
                          setAnswers(a => ({ ...a, [q.uiId]: n }))
                        }
                      />{" "}
                      {n}
                    </label>
                  ))}
                </div>
              )}

              {q.type === "slider" && (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginTop: 8 }}>
                    <span>{q.configs.left}</span>
                    <span>{q.configs.right}</span>
                  </div>
                  <input
                    type="range"
                    min={q.configs.min}
                    max={q.configs.max}
                    step={q.configs.step}
                    value={answers[q.uiId] ?? q.configs.min}
                    onChange={(e) =>
                      setAnswers(a => ({
                        ...a,
                        [q.uiId]: Number(e.target.value),
                      }))
                    }
                    style={{ width: "100%" }}
                  />
                  <div style={{ fontSize: 12, opacity: 0.7 }}>
                    Selected: {answers[q.uiId] ?? q.configs.min}
                  </div>
                </>
              )}
            </>
          )}
          {!preview && (
            <>
              <input
                placeholder="Question text"
                value={q.text}
                onChange={(e) =>
                  setQuestions(qs =>
                    qs.map(x =>
                      x.uiId === q.uiId ? { ...x, text: e.target.value } : x
                    )
                  )
                }
                style={{ ...inputStyle, marginTop: 8 }}
              />

              {q.type === "slider" && (
                <input
                  placeholder="Helper text shown to students"
                  value={q.configs.helperText}
                  onChange={(e) =>
                    setQuestions(qs =>
                      qs.map(x =>
                        x.uiId === q.uiId
                          ? {
                              ...x,
                              configs: {
                                ...x.configs,
                                helperText: e.target.value,
                              },
                            }
                          : x
                      )
                    )
                  }
                  style={{ ...inputStyle, marginTop: 6, opacity: 0.85 }}
                />
              )}

              {q.type === "multiple-choice" &&
                q.configs.options.map((o: string, idx: number) => (
                  <div key={idx} style={{ display: "flex", gap: 6, marginTop: 6 }}>
                    <input
                      value={o}
                      onChange={(e) =>
                        setQuestions(qs =>
                          qs.map(x =>
                            x.uiId === q.uiId
                              ? {
                                  ...x,
                                  configs: {
                                    ...x.configs,
                                    options: x.configs.options.map(
                                      (opt: string, i: number) =>
                                        i === idx ? e.target.value : opt
                                    ),
                                  },
                                }
                              : x
                          )
                        )
                      }
                      style={{ ...inputStyle, flex: 1 }}
                    />
                    <button
                      onClick={() =>
                        setQuestions(qs =>
                          qs.map(x =>
                            x.uiId === q.uiId
                              ? {
                                  ...x,
                                  configs: {
                                    ...x.configs,
                                    options: x.configs.options.filter(
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
                  onClick={() =>
                    setQuestions(qs =>
                      qs.map(x =>
                        x.uiId === q.uiId
                          ? {
                              ...x,
                              configs: {
                                ...x.configs,
                                options: [...x.configs.options, "New option"],
                              },
                            }
                          : x
                      )
                    )
                  }
                  style={{ marginTop: 6 }}
                >
                  Add option
                </button>
              )}
            </>
          )}
        </div>
      ))}

      {!preview && (
        <div style={{ marginTop: 20 }}>
          <button onClick={() => addQuestion("text")}>Add text</button>
          <button onClick={() => addQuestion("multiple-choice")}>Add multiple choice</button>
          <button onClick={() => addQuestion("rating")}>Add rating</button>
          <button onClick={() => addQuestion("slider")}>Add slider</button>
        </div>
      )}
    </div>
  );
}
