"use client";

import { useState } from "react";

/**
 * Local types ONLY for this page.
 * This avoids breaking the rest of the project.
 */

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

  return (
    <div style={{ padding: 32, maxWidth: 900 }}>
      <h1>Create Questionnaire</h1>

      <input
        placeholder="Questionnaire name"
        value={templateName}
        onChange={(e) => setTemplateName(e.target.value)}
        style={{ width: "100%", padding: 8, marginBottom: 12 }}
      />

      <button onClick={() => setPreview((p) => !p)}>
        {preview ? "Back to Editor" : "Preview as Student"}
      </button>

      <hr style={{ margin: "20px 0" }} />

      {questions.map((q, idx) => (
        <div
          key={q.id}
          style={{
            padding: 16,
            marginBottom: 16,
            border: "1px solid #ddd",
            borderRadius: 6,
          }}
        >
          <strong>
            {idx + 1}. {q.type}
          </strong>

          {!preview && (
            <>
              <input
                placeholder="Question text"
                value={q.text}
                onChange={(e) =>
                  updateQuestion(q.id, { text: e.target.value })
                }
                style={{ width: "100%", marginTop: 8 }}
              />

              <div style={{ marginTop: 8 }}>
                <label>
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
              </div>
            </>
          )}

          {/* TEXT */}
          {q.type === "text" && preview && (
            <input
              placeholder="Student types answer here"
              disabled
              style={{ width: "100%", marginTop: 10 }}
            />
          )}

          {/* MULTIPLE CHOICE */}
          {q.type === "multiple-choice" && (
            <>
              {!preview &&
                q.configs.options?.map((opt: string, i: number) => (
                  <input
                    key={i}
                    value={opt}
                    onChange={(e) => {
                      const opts = [...q.configs.options];
                      opts[i] = e.target.value;
                      updateConfigs(q.id, { options: opts });
                    }}
                    style={{ display: "block", marginTop: 6 }}
                  />
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
                q.configs.options?.map((opt: string, i: number) => (
                  <label key={i} style={{ display: "block", marginTop: 6 }}>
                    <input type="radio" disabled /> {opt}
                  </label>
                ))}
            </>
          )}

          {/* RATING */}
          {q.type === "rating" && (
            <>
              {!preview && (
                <div style={{ marginTop: 8 }}>
                  <label>
                    Min
                    <input
                      type="number"
                      value={q.configs.min}
                      onChange={(e) =>
                        updateConfigs(q.id, {
                          min: Number(e.target.value),
                        })
                      }
                    />
                  </label>

                  <label style={{ marginLeft: 12 }}>
                    Max
                    <input
                      type="number"
                      value={q.configs.max}
                      onChange={(e) =>
                        updateConfigs(q.id, {
                          max: Number(e.target.value),
                        })
                      }
                    />
                  </label>
                </div>
              )}

              {preview && (
                <div style={{ marginTop: 10 }}>
                  {Array.from(
                    { length: q.configs.max - q.configs.min + 1 },
                    (_, i) => i + q.configs.min
                  ).map((n) => (
                    <button key={n} disabled style={{ marginRight: 6 }}>
                      {n}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {/* SLIDER */}
          {q.type === "slider" && (
            <>
              {!preview && (
                <div style={{ marginTop: 8 }}>
                  <input
                    placeholder="Left label"
                    value={q.configs.leftLabel ?? ""}
                    onChange={(e) =>
                      updateConfigs(q.id, { leftLabel: e.target.value })
                    }
                  />
                  <input
                    placeholder="Right label"
                    value={q.configs.rightLabel ?? ""}
                    onChange={(e) =>
                      updateConfigs(q.id, { rightLabel: e.target.value })
                    }
                    style={{ marginLeft: 8 }}
                  />
                </div>
              )}

              {preview && (
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
                    disabled
                    style={{ width: "100%" }}
                  />
                </div>
              )}
            </>
          )}
        </div>
      ))}

      <div style={{ marginTop: 20 }}>
        <button onClick={() => addQuestion("text")}>Add Text</button>
        <button onClick={() => addQuestion("multiple-choice")}>
          Add Multiple Choice
        </button>
        <button onClick={() => addQuestion("rating")}>Add Rating</button>
        <button onClick={() => addQuestion("slider")}>Add Slider</button>
      </div>
    </div>
  );
}
