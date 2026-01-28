import type { Answer } from "../types";

const demoAwnsers: Answer[] = [
  { id: "q1", question: "What went well?", awnser: "All" },
  { id: "q2", question: "What could be improved?", awnser: "Yes" },
  { id: "q3", question: "Collaboration score (1-5)", awnser: "SAll of it" },
];


type FeedbackViewProps = {
  awnsers?: Answer[];
};

export function FeedbackView({ awnsers = demoAwnsers }: FeedbackViewProps) {
    return (
    <div>
      <h2>Feedback Submission</h2>
      <ul style={{ paddingLeft: 18, margin: 0, display: "grid", gap: 8 }}>
        {awnsers.map((a) => (
          <li key={a.id}>
            <strong>{a.question}</strong>
            <p>{a.awnser}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
