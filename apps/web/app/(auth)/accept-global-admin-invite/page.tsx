'use client';

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AcceptGlobalAdminInviteForm } from "@/features/auth/components/AcceptGlobalAdminInviteForm";

function InviteAcceptContent() {
  const searchParams = useSearchParams();
  const rawToken = searchParams.get("token");
  const tokenMatch = rawToken?.match(/[a-f0-9]{64}/i);
  const token = tokenMatch ? tokenMatch[0] : rawToken;

  return (
    <div className="auth-card">
      <div className="auth-header">
        <h1 className="auth-title">Accept Global Admin Invite</h1>
        <p className="auth-subtitle">
          Confirm this invite to activate global admin access.
        </p>
      </div>
      <AcceptGlobalAdminInviteForm token={token} />
    </div>
  );
}

export default function AcceptGlobalAdminInvitePage() {
  return (
    <Suspense fallback={null}>
      <InviteAcceptContent />
    </Suspense>
  );
}
