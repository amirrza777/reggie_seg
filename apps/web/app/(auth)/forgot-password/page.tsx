'use client';

import { ForgotPasswordForm } from '@/features/auth/components/ForgotPasswordForm';

const AuthHeader = () => (
  <div className="auth-header">
    <h1 className="auth-title">Reset Password</h1>
    <p className="auth-subtitle">
      Enter your email address and we&apos;ll send you <br /> a link to reset your password.
    </p>
  </div>
);

export default function ForgotPasswordPage() {
  return (
    <div className="auth-card">
      <AuthHeader />
      <ForgotPasswordForm />
    </div>
  );
}