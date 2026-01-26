"use client";

import { useState } from "react";

type QuestionType = "text" | "multiple-choice" | "rating";

type Question = {
  id: number;
  text: string;
  type: QuestionType;
  configs?: {
    options?: string[];
    min?: number;
    max?: number;
  };
};

export default function QuestionnaireBuilder() {
  const [templateName, setTemplateName] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [saving, setSaving] = useState(false);

  const addQuestion = (type: QuestionType) => {
    const base: Question = {
      id: Date.now(),
      text: "",
      type
    };

    if (type === "multiple-choice") {
      base.configs = { options: ["Option 1", "Option 2"] };
    }

    if (type === "rating") {
      base.configs = { min: 1, max: 5 };
    }

    setQuestions([...questions, base]);
  };

  const updateQuestion = (id: number, updates: Partial<Question>) => {
    setQuestions(
      questions.map((q) => (q.id === id ? { ...q, ...updates } : q))
    );
  };

  const updateOption = (qid: number, index: number, value: string) => {
    setQuestions(
      questions.map((q) => {
        if (q.id !== qid || !q.configs?.options) return q;
        const options = [...q.configs.options];
        options[index] = value;
        return { ...q, configs: { ...q.configs, options } };
      })
    );
  };

  const addOption = (qid: number) => {
    setQuestions(
      questions.map((q) => {
        if (q.id !== qid || !q.configs?.options) return q;
        return {
          ...q,
          configs: { ...q.configs, options: [...q.configs.options, "New option"] }
        };
      })
    );
  };

  const saveTemplate = async () => {
    if (!templateName || questions.length === 0) return;

    setSaving(true);
    await fetch("/questionnaires", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateName, questions })
    });
    setSaving(false);
  };

  return (
    <div style={{ padding: 32, background: "#f5f5f5", color: "#111 ",  colorScheme: "light" }}>
      <h1>Create Questionnaire Template</h1>

      <input
        placeholder="Template name"
        value={templateName}
        onChange={(e) => setTemplateName(e.target.value)}
        style={{ width: "100%", padding: 8, marginBottom: 20, backgroundColor: "#ffffff", color: "#111111", border: "1px solid #cbd5e1",WebkitTextFillColor: "#111111" }}
      />

      {questions.map((q, idx) => (
        <div
          key={q.id}
          style={{
            padding: 16,
            marginBottom: 12,
            background: "#fff",
            borderRadius: 6
          }}
        >
          <strong>
            {idx + 1}. {q.type}
          </strong>

          <input
            placeholder="Question text"
            value={q.text}
            onChange={(e) =>
              updateQuestion(q.id, { text: e.target.value })
            }
            style={{ width: "100%", marginTop: 8, backgroundColor: "#ffffff", color: "#111111", border: "1px solid #cbd5e1",WebkitTextFillColor: "#111111" }}
          />

          {q.type === "multiple-choice" &&
            q.configs?.options?.map((opt, i) => (
              <input
                key={i}
                value={opt}
                onChange={(e) =>
                  updateOption(q.id, i, e.target.value)
                }
                style={{ display: "block", marginTop: 6, backgroundColor: "#ffffff", color: "#111111", border: "1px solid #cbd5e1",WebkitTextFillColor: "#111111" }}
              />
            ))}

          {q.type === "multiple-choice" && (
            <button onClick={() => addOption(q.id)}>Add option</button>
          )}

          {q.type === "rating" && (
            <div style={{ marginTop: 8 }}>
              <label>
                Min:
                <input
                  type="number"
                  value={q.configs?.min}
                  onChange={(e) =>
                    updateQuestion(q.id, {
                      configs: { ...q.configs, min: Number(e.target.value) }
                    })
                  }
                  style={{
                    backgroundColor: "#ffffff",
                    color: "#111111",
                    border: "1px solid #cbd5e1",
                    padding: "6px 8px",
                    borderRadius: 4,
                    WebkitTextFillColor: "#111111",
                    appearance: "textfield"
                }}
                />
              </label>
              <label style={{ marginLeft: 12 }}>
                Max:
                <input
                  type="number"
                  value={q.configs?.max}
                  onChange={(e) =>
                    updateQuestion(q.id, {
                      configs: { ...q.configs, max: Number(e.target.value) }
                    })
                  }
                  style={{
                    backgroundColor: "#ffffff",
                    color: "#111111",
                    border: "1px solid #cbd5e1",
                    padding: "6px 8px",
                    borderRadius: 4,
                    WebkitTextFillColor: "#111111",
                    appearance: "textfield"
                }}
                />
              </label>
            </div>
          )}
        </div>
      ))}

      <div style={{ marginTop: 20 }}>
        <button onClick={() => addQuestion("text")}>Add Text</button>
        <button onClick={() => addQuestion("multiple-choice")}>
          Add Multiple Choice
        </button>
        <button onClick={() => addQuestion("rating")}>Add Rating</button>
      </div>

      <button
        onClick={saveTemplate}
        disabled={saving}
        style={{ marginTop: 24 }}
      >
        {saving ? "Saving..." : "Save template"}
      </button>
    </div>
  );
}
