"use client";

import { useState } from "react";

type Question = {
    id: number;
    text: string;
    type: 'text' | 'multiple-choice' | 'rating';
    options?: string[];
    min?: number;
    max?: number;
};

    
export default function QuestionnaireBuilder() {
    const [questions, setQuestions] = useState<Question[]>([]);

const addTextQuestion = () => {
    setQuestions([...questions, { id: Date.now(), text: "text", type: "text" }]);
};
const addMultipleChoiceQuestion = () => {
    setQuestions([...questions, { id: Date.now(), text: "multiple-choice", type: "multiple-choice", options: ["Option 1", "Option 2"] }]);
}
const addRatingQuestion = () => {
    setQuestions([...questions, { id: Date.now(), text: "rating", type: "rating", min: 1, max: 5 }]);
}

    return (<div style={{ padding: 24 }}>
      <h1>Create Questionnaire Template</h1>

      {questions.map((q) => (
        <div key={q.id} style={{ marginBottom: 12 }}>
          <strong>{q.type}</strong>
          <p>{q.text}</p>
        </div>
      ))}

      <button onClick={addTextQuestion}>
        Add Text Question
      </button>
      <button onClick={addMultipleChoiceQuestion}>
        Add Multiple Choice Question
      </button>
      <button onClick={addRatingQuestion}>
        Add Rating Question
      </button>
    </div>
  );
}


