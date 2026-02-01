import type { Answer } from "../types";

const demoAwnsers: Answer[] = [
  { id: "q1", order : 1 , question: "What went well?", answer: "All" },
  { id: "q2", order : 2,  question: "What could be improved?", answer: "Yes" },
  { id: "q3", order : 3, question: "Collaboration score (1-5)", answer: "SAll of it" },
];


type FeedbackViewProps = {
  answers?: Answer[];
};

export function FeedbackView({ answers = demoAwnsers }: FeedbackViewProps) {
    return (
    <div>
      <h2>Feedback Submission</h2>
      <ul style={{ paddingLeft: 18, margin: 0, display: "grid", gap: 8 }}>
        {answers.map((a) => (
          <li key={a.id}>
            <strong>{a.question}</strong>
            <p>{a.answer}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
