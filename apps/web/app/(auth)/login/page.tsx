'use client';

import Link from 'next/link';
import { LoginForm } from '@/features/auth/components/LoginForm';

const AuthHeader = () => (
  <>
    <h1 className="auth-title">Team Feedback</h1>
    <p className="auth-subtitle">
      Sign in to access your peer assessments <br /> and meeting minutes.
    </p>
  </>
);

const AuthFooter = () => (
  <div className="auth-footer">
    <p>
      Don&apos;t have an account?{" "}
      <Link href="/register" className="auth-link">
        Get started
      </Link>
    </p>
    <a href="#" className="auth-link auth-link--subtle">
      Forgot password?
    </a>
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
