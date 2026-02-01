"use client";

import { useState } from "react";

type QuestionType = "text" | "multiple-choice" | "rating" | "slider";

type Question = {
  id: number;
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
      id: Date.now(),
      text: "",
      type,
      configs: {},
    };

    if (type === "multiple-choice") q.configs = { options: ["Yes", "No"] };
    if (type === "rating") q.configs = { min: 1, max: 10 };
    if (type === "slider")
      q.configs = { min: 0, max: 100, step: 1, left: "Disagree", right: "Agree" };

    setQuestions((qns) => [...qns, q]);
  };

  const saveTemplate = async () => {
    if (!templateName || questions.length === 0) {
      alert("Missing name or questions");
      return;
    }

    setSaving(true);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/questionnaires`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            templateName,
            questions: questions.map((q, i) => ({
              text: q.text,
              type: q.type,
              order: i,
              configs: q.configs,
            })),
          }),
        }
      );

      if (!res.ok) {
        const t = await res.text();
        throw new Error(t);
      }

      alert("Saved successfully");
      setTemplateName("");
      setQuestions([]);
      setPreview(false);
    } catch (e) {
      console.error(e);
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
        <button onClick={() => setPreview((p) => !p)}>
          {preview ? "Back to editor" : "Student preview"}
        </button>
        {!preview && (
          <button onClick={saveTemplate} disabled={saving} style={{ marginLeft: 8 }}>
            {saving ? "Saving..." : "Save"}
          </button>
        )}
      </div>

      {questions.map((q, i) => (
        <div
          key={q.id}
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
                  value={answers[q.id] || ""}
                  onChange={(e) =>
                    setAnswers({ ...answers, [q.id]: e.target.value })
                  }
                />
              )}

              {q.type === "multiple-choice" &&
                q.configs.options.map((o: string) => (
                  <label key={o} style={{ display: "block", marginTop: 6 }}>
                    <input
                      type="radio"
                      checked={answers[q.id] === o}
                      onChange={() =>
                        setAnswers({ ...answers, [q.id]: o })
                      }
                    />{" "}
                    {o}
                  </label>
                ))}

              {q.type === "rating" && (
                <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                  {Array.from(
                    { length: q.configs.max - q.configs.min + 1 },
                    (_, n) => n + q.configs.min
                  ).map((n) => (
                    <label key={n} style={{ textAlign: "center" }}>
                      <input
                        type="radio"
                        checked={answers[q.id] === n}
                        onChange={() =>
                          setAnswers({ ...answers, [q.id]: n })
                        }
                      />
                      <div>{n}</div>
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
                    value={answers[q.id] ?? q.configs.min}
                    onChange={(e) =>
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
            <>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <strong>
                  {i + 1}. {q.type}
                </strong>
                <button
                  onClick={() =>
                    setQuestions((qs) => qs.filter((x) => x.id !== q.id))
                  }
                >
                  Remove
                </button>
              </div>

              <input
                placeholder="Question text"
                value={q.text}
                onChange={(e) =>
                  setQuestions((qs) =>
                    qs.map((x) =>
                      x.id === q.id ? { ...x, text: e.target.value } : x
                    )
                  )
                }
                style={{ ...inputStyle, marginTop: 8 }}
              />

              {q.type === "multiple-choice" &&
                q.configs.options.map((o: string, idx: number) => (
                  <div key={idx} style={{ display: "flex", gap: 6, marginTop: 6 }}>
                    <input
                      value={o}
                      onChange={(e) => {
                        const opts = [...q.configs.options];
                        opts[idx] = e.target.value;
                        q.configs.options = opts;
                        setQuestions([...questions]);
                      }}
                      style={{ ...inputStyle, flex: 1 }}
                    />
                    <button
                      onClick={() => {
                        q.configs.options.splice(idx, 1);
                        setQuestions([...questions]);
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}

              {q.type === "multiple-choice" && (
                <button
                  onClick={() => {
                    q.configs.options.push("New option");
                    setQuestions([...questions]);
                  }}
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
