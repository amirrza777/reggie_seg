export default function LoginPage() {
  return (
    <>
      <h1>Sign in</h1>
      <p className="lede">Access the Team Feedback workspace.</p>
      <form className="stack" style={{ marginTop: 12 }}>
        <label className="stack" style={{ gap: 6 }}>
          <span>Email</span>
          <input type="email" name="email" placeholder="you@example.com" required />
        </label>
        <label className="stack" style={{ gap: 6 }}>
          <span>Password</span>
          <input type="password" name="password" placeholder="••••••••" required />
        </label>
        <button className="btn btn--primary" type="submit">
          Sign in
        </button>
      </form>
    </>
  );
}
