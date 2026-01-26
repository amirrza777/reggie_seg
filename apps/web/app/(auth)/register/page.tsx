'use client';

import Link from 'next/link';
import { RegisterForm } from '@/features/auth/components/RegisterForm';

const AuthHeader = () => (
  <>
    <h1 className="auth-title">Create an account</h1>
    <p className="auth-subtitle">
      Start managing your team feedback today.
    </p>
  </>
);

const AuthFooter = () => (
  <div className="auth-footer">
    <p>
      Already have an account?{" "}
      <Link href="/login" className="auth-link">
        Sign in
      </Link>
    </p>
  </div>
);

export default function RegisterPage() {
  return (
    <div className="auth-card">
      <AuthHeader />
      <RegisterForm />
      <AuthFooter />
    </div>
  );
}