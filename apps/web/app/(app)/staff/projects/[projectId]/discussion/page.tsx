export const metadata = { title: "Discussion Forum (Staff)" };

type StaffProjectDiscussionPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function StaffProjectDiscussionPage({ params }: StaffProjectDiscussionPageProps) {
  await params;

  return (
    <div className="stack stack--tabbed">
      <section className="stack" style={{ padding: 24 }}>
        <h1>Discussion Forum</h1>
        <p className="muted">
          This space is reserved for the project discussion forum. Content coming soon.
        </p>
      </section>
    </div>
  );
}
