'use client';

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AcceptEnterpriseAdminInviteForm } from "@/features/auth/components/AcceptEnterpriseAdminInviteForm";

function InviteAcceptContent() {
  const searchParams = useSearchParams();
  const rawToken = searchParams.get("token");
  const tokenMatch = rawToken?.match(/[a-f0-9]{64}/i);
  const token = tokenMatch ? tokenMatch[0] : rawToken;

  return (
    <div className="auth-card">
      <div className="auth-header">
        <h1 className="auth-title">Accept Enterprise Admin Invite</h1>
        <p className="auth-subtitle">
          Confirm this invite to activate enterprise admin access.
        </p>
      </div>
      <AcceptEnterpriseAdminInviteForm token={token} />
    </div>
  );
}

export default function AcceptEnterpriseAdminInvitePage() {
  return (
    <Suspense fallback={null}>
      <InviteAcceptContent />
    </Suspense>
  );
}
