'use client';

import { useSearchParams } from "next/navigation";
import { ResetPasswordForm } from "@/features/auth/components/ResetPasswordForm";

const AuthHeader = () => (
  <div className="auth-header">
    <h1 className="auth-title">Set a New Password</h1>
    <p className="auth-subtitle">
      Choose a new password for your account.
    </p>
  </div>
);

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const rawToken = searchParams.get("token");
  const tokenMatch = rawToken?.match(/[a-f0-9]{64}/i);
  const token = tokenMatch ? tokenMatch[0] : rawToken;

  return (
    <div className="auth-card">
      <AuthHeader />
      <ResetPasswordForm token={token} />
    </div>
  );
}
