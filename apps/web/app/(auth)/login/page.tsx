'use client';

import { useEffect } from "react";
import Link from 'next/link';
import { useRouter } from "next/navigation";
import { LoginForm } from '@/features/auth/components/LoginForm';
import { useUser } from "@/features/auth/useUser";
import { getDefaultSpaceOverviewPath } from "@/shared/auth/default-space";

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
  const { user, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (loading || !user) {
      return;
    }
    router.replace(getDefaultSpaceOverviewPath(user));
  }, [loading, router, user]);

  return (
    <div className="auth-card">
      <AuthHeader />
      <LoginForm />
      <AuthFooter />
    </div>
  );
}
