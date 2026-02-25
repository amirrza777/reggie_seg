export default function EnterpriseHomePage() {
  return (
    <div className="page">
      <header className="page__header">
        <p className="eyebrow">Enterprise</p>
        <h1 className="page__title">Enterprise Overview</h1>
        <p className="page__subtitle">Enterprise overview</p>
      </header>

      <section className="card" style={{ padding: "20px" }}>
        <h2 style={{ marginBottom: 8 }}>Getting started</h2>
        <p className="muted">
          This is a placeholder view. Add enterprise-wide controls, analytics, and data management here.
        </p>
      </section>
    </div>
  );
}
