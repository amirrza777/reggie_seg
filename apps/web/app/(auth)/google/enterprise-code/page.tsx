'use client';

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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

function GoogleEnterpriseCodeContent() {
  const { user, loading } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isSignupMode = searchParams.get("mode") === "signup";
  const formMode = !user && isSignupMode ? "signup" : "join";

  useEffect(() => {
    if (loading) return;
    if (!user && !isSignupMode) {
      router.replace("/login");
      return;
    }
    if (user && (user.isAdmin || user.isEnterpriseAdmin || user.isStaff)) {
      router.replace(getDefaultSpaceOverviewPath(user));
    }
  }, [isSignupMode, loading, user, router]);

  return (
    <div className="auth-card">
      <AuthHeader />
      <GoogleEnterpriseCodeForm mode={formMode} />
    </div>
  );
}

export default function GoogleEnterpriseCodePage() {
  return (
    <Suspense>
      <GoogleEnterpriseCodeContent />
    </Suspense>
  );
}