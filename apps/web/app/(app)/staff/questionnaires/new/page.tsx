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
  const [answers, setAnswers] = useState<Record<number, any>>({});

  const inputStyle = {
    width: "100%",
    padding: 8,
    marginTop: 8,
    color: "#fff",
    background: "rgba(0,0,0,0.35)",
    border: "1px solid #cbd5e1",
    borderRadius: 6,
    WebkitTextFillColor: "#fff",
  };

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

    setQuestions([...questions, q]);
  };

  const updateQuestion = (id: number, updates: Partial<Question>) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, ...updates } : q));
  };

  const updateConfigs = (id: number, updates: any) => {
    setQuestions(questions.map(q =>
      q.id === id ? { ...q, configs: { ...q.configs, ...updates } } : q
    ));
  };

  const removeQuestion = (id: number) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  return (
    <div style={{ padding: 32 }}>
      <h1>Create questionnaire</h1>

      {!preview && (
        <input
          placeholder="Questionnaire name"
          value={templateName}
          onChange={e => setTemplateName(e.target.value)}
          style={inputStyle}
        />
      )}

      <div style={{ marginTop: 16 }}>
        <button onClick={() => setPreview(!preview)}>
          {preview ? "Back to editor" : "Preview as student"}
        </button>
      </div>

      {questions.map((q, index) => (
        <div
          key={q.id}
          style={{
            marginTop: 24,
            padding: 16,
            border: "1px solid rgba(255,255,255,0.25)",
            borderRadius: 8,
          }}
        >
          {/* STUDENT VIEW */}
          {preview ? (
            <>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>
                {q.text || "Untitled question"}
              </div>

              {q.configs?.helpText && (
                <div style={{ fontSize: 13, opacity: 0.75, marginBottom: 8 }}>
                  {q.configs.helpText}
                </div>
              )}

              {q.type === "text" && (
                <input
                  style={inputStyle}
                  value={answers[q.id] || ""}
                  onChange={e =>
                    setAnswers({ ...answers, [q.id]: e.target.value })
                  }
                />
              )}

              {q.type === "multiple-choice" &&
                q.configs.options.map((opt: string) => (
                  <label key={opt} style={{ display: "block", marginTop: 6 }}>
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

              {q.type === "rating" && (
                <div style={{ marginTop: 8 }}>
                  {Array.from(
                    { length: q.configs.max - q.configs.min + 1 },
                    (_, i) => i + q.configs.min
                  ).map(n => (
                    <button
                      key={n}
                      style={{ marginRight: 6 }}
                      onClick={() =>
                        setAnswers({ ...answers, [q.id]: n })
                      }
                    >
                      {n}
                    </button>
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
                    onChange={e =>
                      setAnswers({
                        ...answers,
                        [q.id]: Number(e.target.value),
                      })
                    }
                    style={{ width: "100%" }}
                  />
                </>
              )}
            </>
          ) : (
            /* EDITOR VIEW */
            <>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <strong>
                  {index + 1}. {q.type}
                </strong>
                <button onClick={() => removeQuestion(q.id)}>Remove</button>
              </div>

              <input
                placeholder="Question text"
                value={q.text}
                onChange={e =>
                  updateQuestion(q.id, { text: e.target.value })
                }
                style={inputStyle}
              />

              <input
                placeholder="Help text (optional)"
                value={q.configs.helpText || ""}
                onChange={e =>
                  updateConfigs(q.id, { helpText: e.target.value })
                }
                style={inputStyle}
              />

              {q.type === "multiple-choice" &&
                q.configs.options.map((opt: string, i: number) => (
                  <input
                    key={i}
                    value={opt}
                    onChange={e => {
                      const opts = [...q.configs.options];
                      opts[i] = e.target.value;
                      updateConfigs(q.id, { options: opts });
                    }}
                    style={inputStyle}
                  />
                ))}

              {q.type === "multiple-choice" && (
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
            </>
          )}
        </div>
      ))}

      {!preview && (
        <div style={{ marginTop: 24 }}>
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
