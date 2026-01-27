console.log("API URL:", process.env.NEXT_PUBLIC_API_BASE_URL);



type Questionnaire = {
  id: number;
  templateName: string;
  createdAt: string;
};

async function getQuestionnaires(): Promise<Questionnaire[]> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/questionnaires`,
    {
      cache: "no-store", // always fresh
    }
  );

  if (!res.ok) {
    throw new Error("Failed to fetch questionnaires");
  }

  return res.json();
}

export default async function QuestionnairesPage() {
  const questionnaires = await getQuestionnaires();

  return (
    <div style={{ padding: 32 }}>
      <h1>Questionnaire Templates</h1>

      {questionnaires.length === 0 && <p>No questionnaires yet.</p>}

      <ul style={{ marginTop: 16 }}>
        {questionnaires.map((q) => (
          <li key={q.id} style={{ marginBottom: 8 }}>
            <strong>{q.templateName}</strong>
            <br />
            <small>Created: {new Date(q.createdAt).toLocaleDateString()}</small>
          </li>
        ))}
      </ul>
    </div>
  );
}
