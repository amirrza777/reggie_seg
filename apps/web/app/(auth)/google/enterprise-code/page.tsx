'use client';

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/features/auth/useUser";
import { getDefaultSpaceOverviewPath } from "@/shared/auth/default-space";
import { GoogleEnterpriseCodeForm } from "@/features/auth/components/google/GoogleEnterpriseCodeForm";

const AuthHeader = () => (
  <div className="auth-header">
    <h1 className="auth-title">Join your enterprise</h1>
    <p className="auth-subtitle">
      Enter the enterprise code provided by your organisation to continue.
    </p>
  </div>
);

export default function GoogleEnterpriseCodePage() {
  const { user, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.isAdmin || user.isEnterpriseAdmin || user.isStaff) {
      router.replace(getDefaultSpaceOverviewPath(user));
    }
  }, [loading, user, router]);

  return (
    <div className="auth-card">
      <AuthHeader />
      <GoogleEnterpriseCodeForm />
    </div>
  );
}