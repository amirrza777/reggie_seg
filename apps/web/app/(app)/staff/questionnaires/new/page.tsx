"use client";

import { useState } from "react";

type QuestionType = "text" | "multiple-choice" | "rating" | "slider";

type Question = {
  id: number;
  text: string;
  type: QuestionType;
  configs: any;
};

export default function NewQuestionnairePage() {
  const [templateName, setTemplateName] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);

  // used only for previewing as a student
  const [answers, setAnswers] = useState<Record<number, any>>({});

  const addQuestion = (type: QuestionType) => {
    const q: Question = {
      id: Date.now(),
      text: "",
      type,
      configs: {},
    };

    if (type === "multiple-choice") {
      q.configs = { options: ["Option 1", "Option 2"] };
    }

    if (type === "rating") {
      q.configs = { min: 1, max: 10 };
    }

    if (type === "slider") {
      q.configs = {
        min: 0,
        max: 100,
        step: 1,
        leftLabel: "Strongly disagree",
        rightLabel: "Strongly agree",
      };
    }

    setQuestions((prev) => [...prev, q]);
  };

  const removeQuestion = (id: number) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
    setAnswers((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  };

  const updateQuestion = (id: number, updates: Partial<Question>) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, ...updates } : q))
    );
  };

  const updateConfigs = (id: number, configs: any) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === id ? { ...q, configs: { ...q.configs, ...configs } } : q
      )
    );
  };

  const removeOption = (qid: number, index: number) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== qid) return q;
        const opts = [...q.configs.options];
        opts.splice(index, 1);
        return { ...q, configs: { ...q.configs, options: opts } };
      })
    );
  };

  const saveTemplate = async () => {
    if (!templateName || questions.length === 0) {
      alert("Please add a name and at least one question");
      return;
    }

    setSaving(true);

    try {
      const res = await fetch("/questionnaires", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateName,
          questions: questions.map((q, index) => ({
            text: q.text,
            type: q.type,
            order: index,
            configs: q.configs,
          })),
        }),
      });

      if (!res.ok) throw new Error("Save failed");

      alert("Questionnaire saved");
      setTemplateName("");
      setQuestions([]);
      setAnswers({});
    } catch (err) {
      console.error(err);
      alert("Error saving questionnaire");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: 32 }}>
      <h1>Create Questionnaire</h1>

      <input
        placeholder="Questionnaire name"
        value={templateName}
        onChange={(e) => setTemplateName(e.target.value)}
        style={{ width: "100%", padding: 8, marginBottom: 12 }}
      />

      <div style={{ marginBottom: 16 }}>
        <button onClick={() => setPreview((p) => !p)}>
          {preview ? "Back to editor" : "Preview as student"}
        </button>

        <button
          onClick={saveTemplate}
          disabled={saving}
          style={{ marginLeft: 12 }}
        >
          {saving ? "Saving..." : "Save questionnaire"}
        </button>
      </div>

      <hr />

      {questions.map((q, idx) => (
        <div
          key={q.id}
          style={{
            padding: 16,
            marginTop: 16,
            border: "1px solid #ddd",
            borderRadius: 6,
          }}
        >
          {/* HEADER */}
          {preview ? (
            <div style={{ fontWeight: 600, marginBottom: 6 }}>
              {q.text || "Untitled question"}
            </div>
          ) : (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <strong>
                {idx + 1}. {q.type}
              </strong>
              <button onClick={() => removeQuestion(q.id)}>Remove</button>
            </div>
          )}

          {/* HELP TEXT (STUDENT VIEW) */}
          {preview && q.configs?.helpText && (
            <div
              style={{
                fontSize: 13,
                opacity: 0.7,
                marginBottom: 8,
              }}
            >
              {q.configs.helpText}
            </div>
          )}

          {/* EDITOR CONTROLS */}
          {!preview && (
            <>
              <input
                placeholder="Question text"
                value={q.text}
                onChange={(e) =>
                  updateQuestion(q.id, { text: e.target.value })
                }
                style={{
                  width: "100%",
                  marginTop: 8,
                  color: "#fff",
                  background: "transparent",
                  border: "1px solid #cbd5e1",
                  WebkitTextFillColor: "#fff",
                }}
              />

              <label style={{ display: "block", marginTop: 8 }}>
                <input
                  type="checkbox"
                  checked={q.configs.required ?? false}
                  onChange={(e) =>
                    updateConfigs(q.id, { required: e.target.checked })
                  }
                />{" "}
                Required
              </label>

              <input
                placeholder="Help text shown to students"
                value={q.configs.helpText ?? ""}
                onChange={(e) =>
                  updateConfigs(q.id, { helpText: e.target.value })
                }
                style={{ width: "100%", marginTop: 6 }}
              />
            </>
          )}

          {/* TEXT */}
          {q.type === "text" && preview && (
            <input
              value={answers[q.id] ?? ""}
              onChange={(e) =>
                setAnswers({ ...answers, [q.id]: e.target.value })
              }
              style={{ width: "100%", marginTop: 10 }}
            />
          )}

          {/* MULTIPLE CHOICE */}
          {q.type === "multiple-choice" && (
            <>
              {!preview &&
                q.configs.options.map((opt: string, i: number) => (
                  <div key={i} style={{ marginTop: 6 }}>
                    <input
                      value={opt}
                      onChange={(e) => {
                        const opts = [...q.configs.options];
                        opts[i] = e.target.value;
                        updateConfigs(q.id, { options: opts });
                      }}
                    />
                    <button
                      onClick={() => removeOption(q.id, i)}
                      style={{ marginLeft: 6 }}
                    >
                      ✕
                    </button>
                  </div>
                ))}

              {!preview && (
                <button
                  onClick={() =>
                    updateConfigs(q.id, {
                      options: [...q.configs.options, "New option"],
                    })
                  }
                >
                  Add option
                </button>
              )}

              {preview &&
                q.configs.options.map((opt: string, i: number) => (
                  <label key={i} style={{ display: "block", marginTop: 6 }}>
                    <input
                      type="radio"
                      checked={answers[q.id] === opt}
                      onChange={() =>
                        setAnswers({ ...answers, [q.id]: opt })
                      }
                    />{" "}
                    {opt}
                  </label>
                ))}
            </>
          )}

          {/* RATING */}
          {q.type === "rating" && (
            <>
              {!preview && (
                <div style={{ marginTop: 8 }}>
                  Min{" "}
                  <input
                    type="number"
                    value={q.configs.min}
                    onChange={(e) =>
                      updateConfigs(q.id, { min: Number(e.target.value) })
                    }
                  />
                  Max{" "}
                  <input
                    type="number"
                    value={q.configs.max}
                    onChange={(e) =>
                      updateConfigs(q.id, { max: Number(e.target.value) })
                    }
                  />
                </div>
              )}

              {preview && (
                <div style={{ marginTop: 8 }}>
                  {Array.from(
                    { length: q.configs.max - q.configs.min + 1 },
                    (_, i) => i + q.configs.min
                  ).map((n) => (
                    <button
                      key={n}
                      onClick={() =>
                        setAnswers({ ...answers, [q.id]: n })
                      }
                      style={{
                        marginRight: 6,
                        background:
                          answers[q.id] === n ? "#ddd" : "transparent",
                      }}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {/* SLIDER */}
          {q.type === "slider" && preview && (
            <div style={{ marginTop: 10 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 12,
                }}
              >
                <span>{q.configs.leftLabel}</span>
                <span>{q.configs.rightLabel}</span>
              </div>

              <input
                type="range"
                min={q.configs.min}
                max={q.configs.max}
                step={q.configs.step}
                value={answers[q.id] ?? q.configs.min}
                onChange={(e) =>
                  setAnswers({
                    ...answers,
                    [q.id]: Number(e.target.value),
                  })
                }
                style={{ width: "100%" }}
              />
            </div>
          )}
        </div>
      ))}

      <div style={{ marginTop: 20 }}>
        <button onClick={() => addQuestion("text")}>Add text</button>
        <button onClick={() => addQuestion("multiple-choice")}>
          Add multiple choice
        </button>
        <button onClick={() => addQuestion("rating")}>Add rating</button>
        <button onClick={() => addQuestion("slider")}>Add slider</button>
      </div>
    </div>
  );
}
