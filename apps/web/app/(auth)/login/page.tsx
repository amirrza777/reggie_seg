'use client';

import Link from 'next/link';
import { LoginForm } from '@/features/auth/components/LoginForm';

const AuthHeader = () => (
  <div className="auth-header">
    <h1 className="auth-title">Team Feedback</h1>
    <p className="auth-subtitle">
      Sign in to access your peer assessments <br /> and meeting minutes.
    </p>
  </div>
);

const AuthFooter = () => (
  <div className="auth-footer">
    <p>
      Don&apos;t have an account?{" "}
      <Link href="/register" className="auth-link">
        Get started
      </Link>
    </p>
    <Link href="/forgot-password" className="auth-link auth-link--subtle">
      Forgot password?
    </Link>
  </div>
);

export default function LoginPage() {
  return (
    <div className="auth-card">
      <AuthHeader />
      <LoginForm />
      <AuthFooter />
    </div>
  );
}
