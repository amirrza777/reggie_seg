import { LoginForm } from "@/src/features/auth/components/LoginForm";

export default function LoginPage() {
  return (
    <>
      <h1>Sign in</h1>
      <p className="lede">Access the Team Feedback workspace.</p>
      <div style={{ marginTop: 12 }}>
        <LoginForm />
      </div>
    </>
  );
}
