'use client';

import Link from 'next/link';
import { RegisterForm } from '@/features/auth/components/RegisterForm';

const AuthHeader = () => (
  <div className="auth-header">
    <h1 className="auth-title">Create an account</h1>
    <p className="auth-subtitle">Start managing your team feedback today.</p>
  </div>
);

const AuthFooter = () => (
  <div className="auth-footer">
    <p>
      Already have an account?{" "}
      <Link href="/login" className="auth-link">
        Log in
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
