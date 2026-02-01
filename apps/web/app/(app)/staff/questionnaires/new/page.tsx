"use client";

import { useState } from "react";

type QuestionType = "text" | "multiple-choice" | "rating" | "slider";

type Question = {
  uiId: number;      // UI-only identifier
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
      };

    setQuestions(qs => [...qs, q]);
  };

  const saveTemplate = async () => {
    if (!templateName || questions.length === 0) {
      alert("Add a name and at least one question");
      return;
    }

    setSaving(true);

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

      if (!res.ok) {
        throw new Error(await res.text());
      }

      alert("Questionnaire saved");
      setTemplateName("");
      setQuestions([]);
      setPreview(false);
      setAnswers({});
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
            disabled={saving}
            style={{ marginLeft: 8 }}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        )}
      </div>

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
          {preview ? (
            <>
              <strong>{q.text || "Untitled question"}</strong>

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
                  {Array.from(
                    { length: q.configs.max - q.configs.min + 1 },
                    (_, n) => n + q.configs.min
                  ).map(n => (
                    <label
                      key={n}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        fontSize: 12,
                      }}
                    >
                      <input
                        type="radio"
                        checked={answers[q.uiId] === n}
                        onChange={() =>
                          setAnswers(a => ({ ...a, [q.uiId]: n }))
                        }
                      />
                      {n}
                    </label>
                  ))}
                </div>
              )}

              {q.type === "slider" && (
                <>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 12,
                      marginTop: 8,
                    }}
                  >
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
                </>
              )}
            </>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <strong>
                  {i + 1}. {q.type}
                </strong>
                <button
                  onClick={() =>
                    setQuestions(qs => qs.filter(x => x.uiId !== q.uiId))
                  }
                >
                  Remove
                </button>
              </div>

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

              {q.type === "multiple-choice" &&
                q.configs.options.map((o: string, idx: number) => (
                  <div
                    key={idx}
                    style={{ display: "flex", gap: 6, marginTop: 6 }}
                  >
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
          <button onClick={() => addQuestion("multiple-choice")}>
            Add multiple choice
          </button>
          <button onClick={() => addQuestion("rating")}>Add rating</button>
          <button onClick={() => addQuestion("slider")}>Add slider</button>
        </div>
      )}
    </div>
  );
}
